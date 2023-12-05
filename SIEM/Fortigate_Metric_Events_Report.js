/**
 * @file Fortigate_Metric_Events_Report
 * @reportoverview Shows the events data collected by the fortigate_event_count metric in the
 * PromQL database from the time range specified by the user. It also gets the events grouped by level, type,
 * subtype, source IP, and destination country. The report contains tables with the data obtained from the queries
 * which can be used to create visualizations.
 */

/** 
 * Main method. This method calls getTotalEvents method to get the total events in the time range passed by the user.
 * It also calls getEventsByGroup method to get the events grouped by level, type, subtype, source IP, and destination country.
 * The tables obtained from the queries are returned in an object.
 * 
 * @param {string} from - The start of the time range. Default is 24 hours ago
 * @param {string} to - The end of the time range. Default is 1 min ago
 * @param {string} interval - The interval of the time range. Default is 5 min
 * 
 * @returns {object} - Returns an object containing all the tables obtained from the queries
 */
function main({from="-24h@m", to="@m", interval="5m"}) {
  validateTimeRange(new Time(from), new Time(to))
  // set the report environment variables
  setEnv("from", from)
  setEnv("to", to)

  let totalEvents = getTotalEvents("fortigate_event_count", from, to, interval)
  let levels = getEventsByGroup("fortigate_event_count", from, to, interval, "level")
  let types = getEventsByGroup("fortigate_event_count", from, to, interval, "type")
  let subtypes = getEventsByGroup("fortigate_event_count", from, to, interval, "subtype")
  let topIP = getEventsByGroup("fortigate_event_count", from, to, interval, "srcip")
  let topDestCountry = getEventsByGroup("fortigate_event_count", from, to, interval, "dstcountry")

  return {
      totalEvents,
      levels,
      types,
      subtypes,
      topIP,
      topDestCountry
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
 * This method queries the total events in the metric from the time range specified by the user.
 * The query uses the Platform_Metric_Sort function which builds the query using the options passed as parameters
 * and returns a FPL table with the data obtained from the query.
 * 
 * @param {string} metric - The metric name to be queried
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range
 * @param {string} interval - The interval of the time range
 * 
 * @returns {table} table - Returns a table with the total events in the metric from the time range specified
 */
function getTotalEvents(metric, from, to, interval) {
  let options = {
      metric: metric,
      from: from,
      to: to,
      interval: interval
  }
  let table = Platform_Metric_Sort(options)
  return table
}

/**
 * This methods queries the events data grouped by the field passed as parameter from the time range specified by the user.
 * The query uses the Platform_Metric_Sort function which builds the query using the options passed as parameters
 * and returns a FPL table with the data obtained from the query.
 * 
 * @param {string} metric - The metric name to be queried
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range
 * @param {string} interval - The interval of the time range
 * @param {string / string[]} field - The field(s) to group the events by
 * 
 * @returns {table} table - Returns a table with the total events in the metric grouped by field from the time range specified
 */
function getEventsByGroup(metric, from, to, interval, field) {
  let options = {
      metric: metric,
      from: from,
      to: to,
      interval: interval,
      groupBy: field,
      sort: "topk",
      limit: 10
  }
  let table = Platform_Metric_Sort(options)
  return table
}
