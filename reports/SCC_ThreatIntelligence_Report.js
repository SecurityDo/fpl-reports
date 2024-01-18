/**
 * @file SCC_ThreatIntelligence_Report
 * @reportoverview An executive summary report that shows a summary on the threat intelligence data
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the top threat intelligence
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
  let detections = new Table()
  let p1senders = new Table()
  let p2senders = new Table()
  let policies = new Table()
  let verdicts = new Table()
  let policyActions = new Table()
  let subjects = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    
    events.Append(event_count(from, to))
    detections.Append(top_scc_by_field(from, to, "DetectionMethod"))
    p1senders.Append(top_scc_by_field(from, to, "P1Sender"))
    p2senders.Append(top_scc_by_field(from, to, "P2Sender"))
    policies.Append(top_scc_by_field(from, to, "Policy"))
    verdicts.Append(top_scc_by_field(from, to, "Verdict"))
    policyActions.Append(top_scc_by_field(from, to, "PolicyAction"))
    subjects.Append(top_scc_by_field(from, to, "Subject"))
  }

  // aggregates the data by the given field
  events = aggregate_by_field(events, "Workload")
  detections = aggregate_by_field(detections, "DetectionMethod")
  p1senders = aggregate_by_field(p1senders, "P1Sender").Sort(10, "-count")
  p2senders = aggregate_by_field(p2senders, "P2Sender").Sort(10, "-count")
  policies = aggregate_by_field(policies, "Policy")
  verdicts = aggregate_by_field(verdicts, "Verdict")
  policyActions = aggregate_by_field(policyActions, "PolicyAction")
  subjects = aggregate_by_field(subjects, "Subject").Sort(10, "-count")

  return {
    events,
    detections,
    p1senders,
    p2senders,
    policies,
    verdicts,
    policyActions,
    subjects
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
 * This method gets all the count of all threat intelligence events for the given time range
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
    where sContent(Workload, "ThreatIntelligence")
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
    where sContent(Workload, "ThreatIntelligence")
    aggregate count=count() by {{.field}}
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
