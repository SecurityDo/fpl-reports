/**
 * @file Mimecast_SIEM_Logs_Statistics
 * @reportoverview A summary report of the Mimecast SIEM Logs. This report shows the details on the delivery, receipt
 * and process logs grouped by different fields.
 */

/**
 * Main method. 
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-24h@m", to="@m"}) {    
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the tables
  let deliveryLogsByDir = new Table()
  let deliveryLogsBySenderTop20 = new Table()
  let deliveryLogsByRcptTop20 = new Table()
  let deliveryLogsByRoute = new Table()
  let deliveryLogsByTls = new Table()
  let deliveryLogsByRejType = new Table()
  let receiptLogsBySenderTop20 = new Table()
  let receiptLogsByRcptTop20 = new Table()
  let receiptLogsByAct = new Table()
  let receiptLogsByRejType = new Table()
  let processLogsBySenderTop20 = new Table()
  let processLogsByAct = new Table()
  let processLogsByActHistogram = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      let env = {from, to}   
      deliveryLogsByDir.Append(mimecastSIEMDeliveryLogsByDir(env))
      deliveryLogsBySenderTop20.Append(mimecastSIEMDeliveryLogsByField(from, to, "Sender"))
      deliveryLogsByRcptTop20.Append(mimecastSIEMDeliveryLogsByField(from, to, "Rcpt"))
      deliveryLogsByRoute.Append(mimecastSIEMDeliveryLogsByRoute(env))
      deliveryLogsByTls.Append(mimecastSIEMDeliveryLogsByTls(env))
      deliveryLogsByRejType.Append(mimecastSIEMDeliveryLogsByRejType(env))
      receiptLogsBySenderTop20.Append(mimecastSIEMReceiptLogsByField(from, to, "Sender"))
      receiptLogsByRcptTop20.Append(mimecastSIEMReceiptLogsByField(from, to, "Rcpt"))
      receiptLogsByAct.Append(mimecastSIEMReceiptLogsByAct(env))
      receiptLogsByRejType.Append(mimecastSIEMReceiptLogsByRejType(env))
      processLogsBySenderTop20.Append(mimecastSIEMProcessLogsBySender(env))
      processLogsByAct.Append(mimecastSIEMProcessLogsByAct(env))
      processLogsByActHistogram.Append(mimecastSIEMProcessLogsByActHistogram(env))
  }

  // aggregate the results from all the intervals
  deliveryLogsByDir = getTotalByField(deliveryLogsByDir, "Dir").Sort(0, "-eventCount")
  deliveryLogsBySenderTop20 = getTotalByField(deliveryLogsBySenderTop20, "Sender").Sort(20, "-eventCount")
  deliveryLogsByRcptTop20 = getTotalByField(deliveryLogsByRcptTop20, "Rcpt").Sort(20, "-eventCount")
  deliveryLogsByRoute = getTotalByField(deliveryLogsByRoute, "Route_fix").Sort(0, "-eventCount")
  deliveryLogsByTls = getTotalByField(deliveryLogsByTls, "TlsVer2_fix").Sort(0, "-eventCount")
  receiptLogsBySenderTop20 = getTotalByField(receiptLogsBySenderTop20, "Sender").Sort(20, "-eventCount")
  receiptLogsByRcptTop20 = getTotalByField(receiptLogsByRcptTop20, "Rcpt").Sort(20, "-eventCount")
  receiptLogsByAct = getTotalByField(receiptLogsByAct, "Act").Sort(0, "-eventCount")
  processLogsBySenderTop20 = getTotalByField(processLogsBySenderTop20, "Sender").Sort(20, "-eventCount")
  processLogsByAct = getTotalByField(processLogsByAct, "Act").Sort(0, "-eventCount")

  return {
    deliveryLogsByDir,
    deliveryLogsBySenderTop20,
    deliveryLogsByRcptTop20,
    deliveryLogsByRoute,
    deliveryLogsByTls,
    deliveryLogsByRejType,
    receiptLogsBySenderTop20,
    receiptLogsByRcptTop20,
    receiptLogsByAct,
    receiptLogsByRejType,
    processLogsBySenderTop20,
    processLogsByAct,
    processLogsByActHistogram
  }
}

/**
 * Thie method is a helper method to validate the time range passed by the user.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {boolean} - Returns true if the time range is valid
 */
function validateTimeRange(from, to) {
  // checks to see if the start of the time range is after the end of the time range
  if (from.After(to)) {
      throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  // checks to see if the time range is more than 2 months
  if (to.After(from.Add("60d"))) {
      throw new Error("total duration must not exceed 2 months", "RangeError")
  }
  return true
}

/**
 * This method gets the delivery logs grouped by the Dir field over the time range specified in
 * the environment variables.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a table containing the delivery logs grouped by the Dir field
 */
function mimecastSIEMDeliveryLogsByDir(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {Dir}= f("@fields")
    aggregate eventCount=count() by Dir
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the delivery logs grouped by the field specified over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group the logs by
 *  
 * @returns {Table} table - Returns a table containing the delivery logs grouped by the specified field
 */
function mimecastSIEMDeliveryLogsByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {{.field}}= f("@fields.{{.field}}")
    aggregate eventCount=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the delivery logs grouped by the Route field over the time range specified in
 * the environment variables.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a table containing the delivery logs grouped by the Route field
 */
function mimecastSIEMDeliveryLogsByRoute(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {Route}= f("@fields")
    let Route_fix = condition(len(Route)>0, Route,"-") 
    aggregate eventCount=count() by Route_fix
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the delivery logs grouped by the Tls field over the time range specified in
 * the environment variables.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a table containing the delivery logs grouped by the Tls field
 */
function mimecastSIEMDeliveryLogsByTls(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {TlsVer}= f("@fields")
    let TlsVer2_fix = condition(len(TlsVer)>0, TlsVer,"None") 
    aggregate eventCount=count() by TlsVer2_fix
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the delivery logs grouped by the Dir field over the time range specified in
 * the environment variables as a timechart table.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a timechart table containing the delivery logs grouped by Rej Type
 */
function mimecastSIEMDeliveryLogsByRejType(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {RejType}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by RejType
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the receipt logs grouped by the field specified over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group the logs by
 *  
 * @returns {Table} table - Returns a table containing the receipt logs grouped by the specified field
 */
function mimecastSIEMReceiptLogsByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Inbound")
    let {{.field}} = f("@fields.{{.field}}")
    aggregate eventCount=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the receipt logs grouped by the Act field over the time range specified in
 * the environment variables.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a table containing the receipt logs grouped by the Act field
 */
function mimecastSIEMReceiptLogsByAct(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {Act}= f("@fields")
    aggregate eventCount=count() by Act
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the receipt logs grouped by the Dir field over the time range specified in
 * the environment variables as a timechart table.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a timechart table containing the receipt logs grouped by Rej Type
 */
function mimecastSIEMReceiptLogsByRejType(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {RejType}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by RejType
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the process logs grouped by the Sender field over the time range specified in
 * the environment variables.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a table containing the process logs grouped by the Sender field
 */
function mimecastSIEMProcessLogsBySender(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Sender}= f("@fields")
    aggregate eventCount=count() by Sender
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the process logs grouped by the Act field over the time range specified in
 * the environment variables.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a table containing the process logs grouped by the Act field
 */
function mimecastSIEMProcessLogsByAct(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Act}= f("@fields")
    aggregate eventCount=count() by Act
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the process logs grouped by the Act field over the time range specified in
 * the environment variables as a timechart table.
 * 
 * @param {object} env - The environment variables used in the template
 *  
 * @returns {Table} table - Returns a timechart table containing the process logs grouped by the Act field
 */
function mimecastSIEMProcessLogsByActHistogram(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Act}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by Act
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This helper function groups the table by the specified field and gets the total number of events.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total number of events
 */
function getTotalByField(table, field) {
  return table.Aggregate((obj)=>{
      let fieldValue = obj[field]
      let eventCount = obj["eventCount"]
      return {
          groupBy: {[field]: fieldValue},
          columns: {
              sum: {eventCount}
          }
      }
  })
}
