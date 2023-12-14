/**
 * @file Fortigate_UTM_webfilter
 * @reportoverview Shows the overview of the Fortigate UTM webfilter events over the time range. The webfilter events are
 * grouped by the event type, level, virtual domain, message, action, and hostname. These tables can be used to create
 * visualizations.
 */

/**
 * Main method. This method calls fortigate_utm_webfilter to get the main table for the webfilter events. It then calls
 * aggregate_webfilter_by_field to get an individual table grouped by the specific field.
 * 
 * @param {string || int} from - The start of the time range. Default is past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-24h<m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // gets the main table
  let webfilter_table = fortigate_utm_webfilter(rangeFrom, rangeTo)

  // aggregates the table by the fields
  let count_webfilter_by_eventtype = aggregate_webfilter_by_field(webfilter_table, "eventtype")
  let count_webfilter_by_level = aggregate_webfilter_by_field(webfilter_table, "level")
  let count_webfilter_by_vd = aggregate_webfilter_by_field(webfilter_table, "vd")
  let count_webfilter_by_msg = aggregate_webfilter_by_field(webfilter_table, "msg")
  let top10_webfilter_by_msg = count_webfilter_by_msg.Clone().Sort(10, "-totalCount")
  let count_webfilter_by_action = aggregate_webfilter_by_field(webfilter_table, "action")
  let count_webfilter_by_hostname = aggregate_webfilter_by_field(webfilter_table, "hostname")
  let top10_webfiler_by_hostname = count_webfilter_by_hostname.Clone().Sort(10, "-totalCount")
  
  return {
    count_webfilter_by_eventtype,
    count_webfilter_by_level,
    count_webfilter_by_vd,
    count_webfilter_by_msg,
    top10_webfilter_by_msg,
    count_webfilter_by_action,
    count_webfilter_by_hostname,
    top10_webfiler_by_hostname
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
 * This method breaks the query into intervals of 1 day and combines each of the table
 * into one big table.
 * 
 * @param {Time} rangeFrom - The start of the time range
 * @param {Time} rangeTo - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the webfilter events from the time range
 */
function fortigate_utm_webfilter(rangeFrom, rangeTo) {
  let table = new Table()
  let interval = "1d"
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate")
    let {type,subtype,eventtype,level,vd,msg,action,hostname}=f("@fortigate")
    where type=="utm" and subtype=="webfilter"
  `
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {from, to}
    table.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }
  return table
}

/**
 * This method takes the main table and groups the events by the field specified and gets the total count
 * 
 * @param {Table} webfilter_table - The table containing the webfilter events
 * @param {string} field - The field to group by
 * 
 * @returns {Table} - Returns a table containing the total count of events grouped by the field
 */
function aggregate_webfilter_by_field(webfilter_table, field) {
  return webfilter_table.Aggregate((obj) => {
    let fieldValue = obj[field]
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        count: {totalCount: true}
      }
    }
  })
}
