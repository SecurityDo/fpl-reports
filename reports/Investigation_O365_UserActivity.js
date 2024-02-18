/**
 * @file Investigation_O365_UserActivity
 * @reportoverview An investigation report that shows the activity of a specific Office365 user over a time period.
 */

/**
 * Main method. This method uses a template to get all activity of the user within the time frame.
 * 
 * @param {string || int} from - The start of the time range. Default is the last 7 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 * @param {string} username - The office365 username to investigate
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({username, from="-7d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // intitialize the table used and query template
  let table = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@sender","office365") and sContent("@fields.UserId", "{{.username}}") and not sContent("@fields.Operation", "UserLoginFailed") and not sContent("@fields.Operation", "UserLoggedIn")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    let {Workload, Operation,  ApplicationName, City="_ip.city", Country="_ip.country"}=f("@fields")
    let Details=coalesce(f("@fields.SourceFileName"), f("@fields.TargetUserOrGroupName"))
    sort 1000 timestamp
  `

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {username, from, to}
    table.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }
  // remove the timestamp column from the table
  table = table.RemoveColumn("timestamp")

  return {table}
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