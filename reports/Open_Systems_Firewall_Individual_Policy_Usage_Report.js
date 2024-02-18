/**
 * @file Open_Systems_Firewall_Individual_Policy_Usage_Report
 * @reportoverview A summary report of all the individual policy usage for the Open Systems Firewall
 * over a specific time range
 */

/**
 * Main method. This method gets the usage of all the individual policies for the Open Systems Firewall.
 * 
 * @param {string || int} from - The start of the time range. Default is the past 7 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-7d<m", to="@m", hostname, policyid}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the table and query to be used
  let usage = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","OSFirewall")
    let {rule_id, host_name} = f("@os_firewall")
    let _time=f("@timestamp")
    where sContent(rule_id,"{{.policyid}}") and sStartswith(host_name,"{{.hostname}}")
    aggregate rule_id=count() by timeslot=timebucket("1d", _time)
    let iso2822=strftime("%a, %d %b %Y %T %z", timeslot)
    table iso2822, rule_id
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