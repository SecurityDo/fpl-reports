/**
 * @file Outward_Flow_Report
 * @reportoverview A summary report for the outward flow events from Home Net over the time range specified
 */

/**
 * Main method. This method calls getData, getPorts, and getSourceIPs to get the outward flow events 
 * over the time range specified.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-7d@d", to="@d"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the tables used
  let data = new Table()
  let ports = new Table()
  let sourceIPs = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      let env = {from, to, type: "metaflow"}
      data.Append(getData(env))
      ports.Append(getPorts(env))
      sourceIPs.Append(getSourceIPs(env))
  }

  // aggregate the tables to get an overall count of the events over all intervals
  ports = ports.Aggregate(({DestPort, Count}) => {
    return {
      groupBy: {DestPort},
      columns: {
        sum: {Count}
      }
    }
  })
  sourceIPs = sourceIPs.Aggregate(({SourceIP, Count}) => {
    return {
      groupBy: {SourceIP},
      columns: {
        sum: {Count}
      }
    }
  })
  let topSourceIPs = sourceIPs.Clone().Sort(10, "-Count")

  return {
    data,
    ports,
    sourceIPs,
    topSourceIPs
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
 * This method is a helper method to get the outward flow events over the time range
 * 
 * @param {object} env - An object containing the environment variables
 *  
 * @returns {Table} table - Returns a table containing the outward flow events over the time range
 */
function getData(env) {
  let fplTemplate = `
    search {type="{{.type}}",from="{{.from}}",to="{{.to}}"} sEntityinfo("sip","HOME_NET") and not sEntityinfo("dip","HOME_NET") and not sRange("txB","0","0") and not sRange("rxB","0","0") and not sRange("dp","5353","5353") and not sRange("dp","443","443") and not sRange("dp","80","80") and not sRange("dp","53","53") and not sRange("dp","0","0")
    let Hostname = f("s_asset.hostname")
    let SourceIP = f("sip")
    let DestIP  = f("dip")
    let DestPort = f("dp")
    let DestCountry = f("d_country")
    let DestOrg = f("d_org")
    let TxB = f("txB")
    let RxB = f("rxB")
    aggregate Count=count(), TotalTxB=sum(TxB), TotalRxB=sum(RxB) by Hostname,SourceIP, DestIP, DestPort, DestCountry, DestOrg
    table Hostname, SourceIP, DestIP, DestPort, DestCountry, DestOrg, TotalTxB, TotalRxB, Count
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get different ports used and the number of times they were used over the time range
 * 
 * @param {object} env - An object containing the environment variables
 *  
 * @returns {Table} table - Returns a table containing the ports used
 */
function getPorts(env) {
  let fplTemplate = `
    search {type="{{.type}}",from="{{.from}}",to="{{.to}}"} sEntityinfo("sip","HOME_NET") and not sEntityinfo("dip","HOME_NET") and not sRange("txB","0","0") and not sRange("rxB","0","0") and not         sRange("dp","5353","5353") and not sRange("dp","443","443") and not sRange("dp","80","80") and not sRange("dp","53","53") and not sRange("dp","0","0")
    let DestPort = f("dp")
    aggregate Count=count() by DestPort
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get different source ip used and the number of times they were used over the time range
 * 
 * @param {object} env - An object containing the environment variables
 *  
 * @returns {Table} table - Returns a table containing the source ip used
 */
function getSourceIPs(env) {
  let fplTemplate = `
    search {type="{{.type}}",from="{{.from}}",to="{{.to}}"} sEntityinfo("sip","HOME_NET") and not sEntityinfo("dip","HOME_NET") and not sRange("txB","0","0") and not sRange("rxB","0","0") and not         sRange("dp","5353","5353") and not sRange("dp","443","443") and not sRange("dp","80","80") and not sRange("dp","53","53") and not sRange("dp","0","0")
    let SourceIP = f("sip")
    aggregate Count=count() by SourceIP
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
