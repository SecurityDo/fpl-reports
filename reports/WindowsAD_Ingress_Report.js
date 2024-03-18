/**
 * @file WindowsAD_Ingress_Report
 * @reportoverview A summary report for the ingress data from WindowsAD. The report includes
 * the total size and total count by event id and hostname as well as the top 10 size by those fields.
 */

/**
 * Main method. This method calls cloudfunnelBy to get the cloud funnel statistics grouped by the different fields over
 * different time intervals and then join the table to get the overall total size and total count. The tables 
 * are then processed to get the top 10 size.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from = "-24h@h", to = "@h"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)
  let diffsec = (rangeTo.Unix() - rangeFrom.Unix())
  let diff = diffsec/3600.0 // range in hours

  // initializes the tables to be used
  let eventIDStats = new Table()
  let hostnameStats = new Table()
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
      eventIDStats.Append(sizeByEventID(from, to))
      hostnameStats.Append(sizeByHostname(from, to))
  }
  
  // aggregate the tables to get the overall total size over all time intervals
  eventIDStats = eventIDStats.Aggregate(({eventID, totalSize, eventCount}) => {
      return {
          groupBy: {eventID},
          columns: {
              sum: {totalSize},
              sum: {eventCount}
          }
      }
  })
  hostnameStats = hostnameStats.Aggregate(({hostname, totalSize, eventCount}) => {
      return {
          groupBy: {hostname},
          columns: {
              sum: {totalSize},
              sum: {eventCount}
          }
      }
  })
  
  // gets the total size and total count over all time intervals
  let totalADStats = hostnameStats.GroupBy(({totalSize}) => {
      return {
        columns: {
          sum: {totalIngressSize: totalSize},
          count: {hostname: true}
        }
      }
  })
  
  // gets the top 10 size by event id and hostname
  let topADSizeByEventID = eventIDStats.Clone().Sort(10, "-totalSize")
  let topADSizeByHostname = hostnameStats.Clone().Sort(10, "-totalSize")
  totalStatsTimeTable = totalStatsTimeTable.Clone().Sort(0, "+Date") // sort by Date, for histogram
  
  return {
    eventIDStats,
    hostnameStats,
    totalADStats,
    topADSizeByEventID,
    topADSizeByHostname,
    totalStatsTimeTable
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
 * This method is a helper method to get the total size and event count of windows AD data
 * grouped by the event id over the time range.
 * 
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range 
 *  
 * @returns {Table} table - Returns a table containing the total size and event count grouped by event id
 */
function sizeByEventID(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@eventType", "nxlogAD")
      let eid=f("@fields.EventID"), size=f("__size__")
      let {Description} = entitylookup(eid, "AD_EventID")
      let eventID = condition(len(Description)>0, eid .. " - " .. Description, eid) 
      aggregate totalSize=sum(size), eventCount=count() by eventID
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get the total size and event count of windows AD data
 * grouped by the hostname over the time range.
 * 
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range 
 *  
 * @returns {Table} table - Returns a table containing the total size and event count grouped by hostname
 */
function sizeByHostname(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@eventType", "nxlogAD")
      let host=f("@fields.Hostname"), size=f("__size__")
      let {sp} = split(host, ".")
      let hostname = tolower(sp)
      aggregate totalSize=sum(size), eventCount=count() by hostname
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
      search {from="{{.from}}", to="{{.to}}"} sContent("@eventType", "nxlogAD")
      let timestamp=f("@timestamp"), size=f("__size__")
      let Date=strftime("%D %H:%M",timebucket("{{.interval}}", timestamp))
      aggregate totalSize=sum(size), eventCount=count() by Date
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}