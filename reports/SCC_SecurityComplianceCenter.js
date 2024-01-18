/**
 * @file SCC_SecurityComplianceCenter
 * @reportoverview An executive summary report that shows a summary on the security complaince center data
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the top security compliance center
 * workload events by userid, p1sender, p2sender, subject and datafields.
 * 
 * @param {string || int} from - The start of the time range. Default is 1 day ago from the past hour
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-1d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // intitialize the table used
  let events = new Table()
  let categories = new Table()
  let operations = new Table()
  let severity = new Table()
  let userIDs = new Table()
  let p1senders = new Table()
  let p2senders = new Table()
  let subjects = new Table()
  let datafields = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    
    events.Append(event_count(from, to))
    categories.Append(top_scc_by_field(from, to, "Category"))
    operations.Append(top_scc_by_field(from, to, "Operation"))
    severity.Append(top_scc_by_field(from, to, "Severity"))
    userIDs.Append(top_scc_by_field(from, to, "UserId"))
    p1senders.Append(top_scc_by_field(from, to, "P1Sender"))
    p2senders.Append(top_scc_by_field(from, to, "P2Sender"))
    subjects.Append(top_scc_by_field(from, to, "Subject"))
    datafields.Append(top_scc_datafields(from, to))
  }

  // aggregates the data by the given field
  events = aggregate_by_field(events, "Workload")
  categories = aggregate_by_field(categories, "Category")
  operations = aggregate_by_field(operations, "Operation")
  severity = aggregate_by_field(severity, "Severity")
  userIDs = aggregate_by_field(userIDs, "UserId").Sort(10, "-count")
  p1senders = aggregate_by_field(p1senders, "P1Sender").Sort(10, "-count")
  p2senders = aggregate_by_field(p2senders, "P2Sender").Sort(10, "-count")
  subjects = aggregate_by_field(subjects, "Subject").Sort(10, "-count")
  datafields = aggregate_by_field(datafields, "DataFields").Sort(10, "-count")

  return {
    events,
    categories,
    operations,
    severity,
    userIDs,
    p1senders,
    p2senders,
    subjects,
    datafields
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
  return true
}

/**
 * This method gets all the count of all security compliance center events for the given time range
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table with the event count
 */
function event_count(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.General")
    let {Workload}=f("@fields")
    where sContent(Workload, "SecurityComplianceCenter")
    aggregate count=count() by Workload
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the scc event count grouped by the field over the time period
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} - Returns a table with the count grouped by the field
 */
function top_scc_by_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.General")
    let {Workload}=f("@fields")
    let {{.field}}=f("@fields.{{.field}}")
    where sContent(Workload, "SecurityComplianceCenter")
    aggregate count=count() by {{.field}}
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the scc event count grouped by datafields over the time period
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table with the count grouped by the field
 */
function top_scc_datafields(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.General")
    let {Workload}=f("@fields")
    let {DataFields="an"}=f("@fields.DataFields")
    where sContent(Workload, "SecurityComplianceCenter")
    aggregate count=count() by DataFields
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method aggregates the data by the given field
 * 
 * @param {Table} table - The table to aggregate
 * @param {string} field - The field to aggregate by
 * 
 * @returns {Table} - Returns an aggregated table by the given field
 */
function aggregate_by_field(table, field) {
  return table.Aggregate((obj) => {
    let fieldValue = obj[field]
    let count = obj.count
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        sum: {count}
      }
    }
  })
}
