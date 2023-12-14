/**
 * @file Fortigate_Individual_Policy_Usage_Report
 * @reportoverview An investigation report that shows the usage of a specific policy on a specific fortigate device.
 * The report contains a summary time series table that shows the total number of events over a time period
 */

/**
 * Main method. This method uses a template to get the total number of events for a specific policy over the time range.
 * 
 * @param {string || int} from - The start of the time range. Default is last 7 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 * @param {string} hostname - The fortigate hostname to investigate
 * @param {string} policyid - The fortigate policy id to investigate
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-7d<m", to="@m", hostname, policyid}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the table used
  let usage = new Table()

  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","Fortigate")
    let {policyid, devname} = f("@fortigate")
    let _time=f("@timestamp")
    where sContent(policyid,"{{.policyid}}") and sStartswith(devname,"{{.hostname}}")
    aggregate policyid=count() by timeslot=timebucket("1d", _time)
    let iso2822=strftime("%a, %d %b %Y %T %z", timeslot)
    table iso2822, policyid
  `

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {from, to, hostname, policyid}
    usage.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }

  return {usage}
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