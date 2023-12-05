/**
 * @file Event_Ingress_Monthly_Report.js
 * @reportoverview Shows the overview of the total event ingress over the time range specified by the user by default,
 * it is a monthly report. It gets all events from LavaDB as a total events table and tables grouped by source, sender,
 * and event type. These tables can be used to create visualizations.
 */

/**
 * Main method. This method calls eventSizeBySource, eventSizeBySender, and eventSizeByEventType to get the total
 * event size and count grouped by source, sender, and event type from the time range. The tables obtained are returned
 * as an object.
 * 
 * @param {string} from - The start of the time range. Default is last 30 days
 * @param {string} to - The end of the time range. Default is the past day
 *  
 * @returns 
 */
function main({from="-30d<d", to="@d"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  // sets the report environment variables
  setEnv("from", from)
  setEnv("to", to)

  // initailze the tables to hold the data as an empty table
  let statsBySource = new Table()
  let statsBySender = new Table()
  let statsByEventType = new Table()
  let interval = "5d"

  // break the time range into intervals of 5 days and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = rangeFrom
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    statsBySource.Append(eventSizeBySource(from, to))
    statsBySender.Append(eventSizeBySender(from, to))
    statsByEventType.Append(eventSizeByEventType(from, to))
  }

  // aggregate the data grouped by source to get the total size and count
  statsBySource = statsBySource.Aggregate(({source, totalSize, eventCount})=>{
      return {
        groupBy: {source},
        columns: {
          sum: {totalSize},
          sum: {eventCount}
        }
      }
  })

  // aggregate the data grouped by sender to get the total size and count
  statsBySender = statsBySender.Aggregate(({sender, totalSize, eventCount})=>{
      return {
        groupBy: {sender},
        columns: {
          sum: {totalSize}, 
          sum: {eventCount
          }
        }
      }
  })

  // aggregate the data grouped by event type to get the total size and count
  statsByEventType = statsByEventType.Aggregate(({eventtype, totalSize, eventCount})=>{
      return {
        groupBy: {eventtype},
        columns: {
          sum: {totalSize},
          sum: {eventCount}
        }
      }
  })

  // use the event type table to get the overall total ingress size and total number of events
  let totalStats = statsByEventType.Aggregate(({totalSize})=>{
      return {
        columns: { 
          sum: {totalIngressSize: totalSize},
          count: {totalEventTypes: true}
        }
      }
  })

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

  // sort the tables by total size to get the top 10 sources, senders, and event types
  let topSizeBySource = statsBySource.Clone().Sort(10, "totalSize")
  let topSizeBySender = statsBySender.Clone().Sort(10, "totalSize")
  let topSizeByEventType = statsByEventType.Clone().Sort(10, "totalSize")

  return {
    statsByEventType,
    totalStats,
    totalStatsBySender,
    topSizeBySource,
    topSizeBySender,
    topSizeByEventType
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
 * @returns {table} table - Returns a table containing the total event size and count grouped by source from the time range
 */
function eventSizeBySource(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      assign source=f("@source"), size=f("__size__")
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
 * @returns {table} table - Returns a table containing the total event size and count grouped by sender from the time range
 */
function eventSizeBySender(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      assign sender=f("@sender"), size=f("__size__")
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
 * @returns {table} table - Returns a table containing the total event size and count grouped by event type from the time range
 */
function eventSizeByEventType(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      assign eventType=f("@eventType"), event_type=f("@event_type"), size=f("__size__")
      let eventtype = coalesce(eventType, event_type)
      aggregate totalSize=sum(size), eventCount=count() by eventtype
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
