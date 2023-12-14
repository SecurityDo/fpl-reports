/**
 * @file Fortigate_UTM_IPS
 * @reportoverview Shows the overview of the Fortigate UTM IPS events over the time range specified by the user by default,
 * The report contains histograms of the events by attack, action and source country. It also contains tables of the events
 * grouped by attack, source country, action, profile, and level. These tables can be used to create visualizations.
 */

/**
 * Main method. This method calls histogram_by_field to get the table for creating histograms for the fields attack, action,
 * and source country. It also calls fortigate_utm_ips_by_field to get the tables grouped by attack, source country, action,
 * profile, and level. The tables obtained are returned as an object.
 * 
 * @param {string || int} from - The start of the time range. Default is last 5 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-5d<m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the tables to be used
  let attack_histogram = new Table()
  let action_histogram = new Table()
  let src_histogram = new Table()
  let attack_table = new Table()
  let country_table = new Table()
  let action_table = new Table()
  let profile_table = new Table()
  let level_table = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    // gets the histogram data by field
    attack_histogram.Append(histogram_by_field(from, to, "attack"))
    action_histogram.Append(histogram_by_field(from, to, "action"))
    src_histogram.Append(histogram_by_field(from, to, "srccountry"))

    // gets the tables grouped by field
    attack_table.Append(fortigate_utm_ips_by_attack(from, to))
    country_table.Append(fortigate_utm_ips_by_field(from, to, "srccountry"))
    action_table.Append(fortigate_utm_ips_by_field(from, to, "action"))
    profile_table.Append(fortigate_utm_ips_by_field(from, to, "profile"))
    level_table.Append(fortigate_utm_ips_by_field(from, to, "level"))
  }

  // aggregates the table over all time intervals
  attack_table = attack_table.Aggregate(({attack, severity, total})=>{
    return {
      groupBy: {attack},
      columns: {
        max: {severity},
        sum: {total}
      }
    }
  })
  country_table = getTotalByField(country_table, "srccountry")
  action_table = getTotalByField(action_table, "action")
  profile_table = getTotalByField(profile_table, "profile")
  level_table = getTotalByField(level_table, "level")

  return {
    attack_histogram,
    action_histogram,
    src_histogram,
    attack_table,
    country_table,
    action_table,
    profile_table,
    level_table
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
 * This method groups the events by the field specified and creates a timechart of the total count of events grouped by the field over
 * the specified time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} table - Returns a timechart table containing the total count by field
 */
function histogram_by_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = ""
  if (field == "srccountry") {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {srccountry}=f("@fortigate"), timestamp=f("@timestamp")
      where not sContent(srccountry,"Reserved")
      timechart {span="1h", limit=10} total=count() by srccountry
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {{.field}}=f("@fortigate.{{.field}}"), timestamp=f("@timestamp")
      timechart {span="1h", limit=10} total=count() by {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method groups the events by the field specified and creates a table of the total count of events grouped by the field over
 * the specified time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} table - Returns a table containing the total count by field
 */
function fortigate_utm_ips_by_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = ""
  if (field == "srccountry") {
    // drop the events with source country as Reserved
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {srccountry}=f("@fortigate")
      where not sContent(srccountry,"Reserved")
      aggregate total=count() by srccountry
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {{.field}}=f("@fortigate.{{.field}}")
      aggregate total=count() by {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method groups the events by attack and creates a table of the total count over the specified time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the total count by attack or an error if the query fails
 */
function fortigate_utm_ips_by_attack(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
    let {attack, severity}=f("@fortigate")
    aggregate total=count(), severity=max(severity) by attack
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This helper function groups the table by the specified field and gets the total number of sign ins.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total count
 */
function getTotalByField(table, field) {
  return table.Aggregate((obj)=>{
      let fieldValue = obj[field]
      let total = obj["total"]
      return {
          groupBy: {[field]: fieldValue},
          columns: {
              sum: {total}
          }
      }
  })
}
