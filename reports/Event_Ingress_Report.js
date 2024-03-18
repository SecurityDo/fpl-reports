/**
 * @file Event_Ingress_Report
 * @reportoverview Shows the overview of the total event ingress over the time range specified by the user by default,
 * it is a monthly report. It gets all events from LavaDB as a total events table and tables grouped by source, sender,
 * and event type. These tables can be used to create visualizations.
 */

/**
 * Main method. This method calls eventSizeBySource, eventSizeBySender, and eventSizeByEventType to get the total
 * event size and count grouped by source, sender, and event type from the time range. The tables obtained are returned
 * as an object.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-1d@h", to="@h"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)
  let diffsec = (rangeTo.Unix() - rangeFrom.Unix())
  let diff = diffsec/3600.0 // range in hours

  // initailze the tables to hold the data as an empty table
  let statsBySource = new Table()
  let statsBySender = new Table()
  let statsByEventType = new Table()
  let totalStatsTimeTable = new Table()
  
  let interval = "7d"
  let hist_interval = "1h"
  
  if (diff > 48) {
    hist_interval = "1d"
  }
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)

    totalStatsTimeTable.Append(eventsTimeTable(from, to, hist_interval))
    statsBySource.Append(eventSizeBySource(from, to))
    statsBySender.Append(eventSizeBySender(from, to))
    statsByEventType.Append(eventSizeByEventType(from, to))
  }

  // aggregate the data to get the total size and count grouped by the field
  statsBySource = getTotal(statsBySource, "source")
  statsBySender = getTotal(statsBySender, "sender")
  statsByEventType = getTotal(statsByEventType, "eventtype")

  let statsByProductName = lookupProductName(statsByEventType, "eventtype")
  statsByProductName = getTotal(statsByProductName, "ProductName")

  // sort the overall total ingress size and total number of events by sender then calculate the EPS and EPH
  let totalStatsBySender = statsBySender.GroupBy(({totalSize, eventCount})=>{
      return {
        columns: {
          sum: {totalIngressSize: totalSize},
          sum: {totalEventCount: eventCount}
        }
      }
  })
  totalStatsBySender.NewColumnLambda("totalEPS", "", (row) => row.totalEventCount / 2592000)
  totalStatsBySender.NewColumnLambda("totalEPH", "", (row) => row.totalEventCount / 720)

  // use the event type table to get the overall total ingress size and total number of events
  let totalStats = statsByEventType.Aggregate(({totalSize})=>{
    return {
      columns: { 
        sum: {totalIngressSize: totalSize},
        count: {totalEventTypes: true}
      }
    }
  })

  // sort the tables by total size to get the top 10 sources, senders, and event types
  let topSizeBySource = statsBySource.Clone().Sort(10, "totalSize")
  let topSizeBySender = statsBySender.Clone().Sort(10, "totalSize")
  let topSizeByEventType = statsByEventType.Clone().Sort(10, "totalSize")
  let topSizeByProductName = statsByProductName.Clone().Sort(10, "totalSize")
  totalStatsTimeTable = totalStatsTimeTable.Clone().Sort(0, "+Date") // sort by Date, for histogram

  return {
    statsByEventType,
    statsByProductName,
    totalStats,
    totalStatsTimeTable,
    totalStatsBySender,
    topSizeBySource,
    topSizeBySender,
    topSizeByEventType,
    topSizeByProductName
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
 * Thie method uses the environment variables to build a fpl query to get the event size and count grouped by source
 * 
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range 
 * 
 * @returns {Table} table - Returns a table containing the total event size and count grouped by source
 */
function eventSizeBySource(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      let source=f("@source"), size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by source
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * Thie method uses the environment variables to build a fpl query to get the event size and count grouped by sender
 * 
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range 
 * 
 * @returns {Table} table - Returns a table containing the total event size and count grouped by sender
 */
function eventSizeBySender(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      let sender=f("@sender"), size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by sender
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * Thie method uses the environment variables to build a fpl query to get the event size and count grouped by event type
 * 
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range 
 * 
 * @returns {Table} table - Returns a table containing the total event size and count grouped by event type
 */
function eventSizeByEventType(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
    let eventType=f("@eventType"), event_type=f("@event_type"), size=f("__size__")
    let et = coalesce(eventType, event_type)
    let eventtype = condition(et != "", et, "N/A")
    aggregate totalSize=sum(size), eventCount=count() by eventtype
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * Thie method uses the environment variables to build a fpl query to get the event size and count grouped by timestamp
 * 
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range 
 * 
 * @returns {Table} table - Returns a table containing the total event size and count grouped by source
 */
function eventsTimeTable(from, to, interval) {
  let env = {from, to, interval}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      let timestamp=f("@timestamp"), size=f("__size__")
      let Date=strftime("%D %H:%M",timebucket("{{.interval}}", timestamp))
      aggregate totalSize=sum(size), eventCount=count() by Date
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return {table}
}

/**
 * This helper function groups the table by the specified field and gets the total size.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total size and count
 */
function getTotal(table, field) {
  return table.Aggregate((obj) => {
    let fieldValue = obj[field]
    let totalSize = obj.totalSize
    let eventCount = obj.eventCount
    return {
      groupBy: {[field]: fieldValue},
      columns: {
          sum: {totalSize: totalSize},
          sum: {eventCount: eventCount}
      }
    }
  })
}

function lookupProductName(t1, field) {
  t1.NewColumnLambda("ProductName", "", ((row) => {
      let et = row[field]
      if (startsWith(et, "@")){
          et = trimPrefix(et, "@")
      }
      if (et == "nxlogDHCP"){
          return "WindowsSrv_DHCP (nxlog)"
      }
      if (startsWith(et, "nxlog")){
          return "WindowsSrv (NXLog)"
      }
      if (et == "Fortigate" || et == "fortigate"){
          return "FortiGateNGFW"
      }
      if (et == "SonicWall" || et == "sonicwall"){
          return "SonicWallNGFW"
      }
      if (et == "Meraki"){
          return "CiscoMeraki"
      }
      if (et == "PaloAlto"){
          return "PaloAltoFW"
      }
      if (et == "peplink"){
          return "Peplink"
      }
      if (et == "netscaler"){
          return "CitrixNetScaler"
      }
      if (et == "canary"){
          return "ThinkstCanary"
      }
      if (et == "Sophos"){
          return "SophosFW"
      }
      if (et == "cylance"){
          return "CylanceSyslog"
      }
      if (et == "Linux" || et == "sshd" || et == "linux-sshd" || et == "audispd"){
          return "LinuxSyslog"
      }
      return et
  }))
  return t1
}
