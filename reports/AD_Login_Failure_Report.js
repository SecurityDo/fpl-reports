/**
 * @file AD_Login_Failure_Report
 * @reportoverview A summary report that shows the list of failed azure ad logins and password changes over a time range.
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the behavior events for each day.
 * The overall table is then broken down into smaller tables based on the behavior, key and level.
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
  let failed_logins = new Table()
  let changed_passwords = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    
    failed_logins.Append(failed_login(from, to))
    changed_passwords.Append(changed_password(from, to))
  }

  failed_logins = failed_logins.Sort(0, "-timestamp")
  changed_passwords = changed_passwords.Sort(0, "-timestamp")
  let failed_logins_map = failed_logins.Aggregate(({SourceIP}) => {
    let {city, country, countryCode, latitude, longitude, isp, org} = geoip(SourceIP)
    if (isp == "Microsoft Corporation" || org == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {SourceIP},
      columns: {
        first: {city},
        first: {country},
        first: {countryCode},
        first: {latitude},
        first: {longitude},
        first: {isp},
        first: {org}
      }
    }
  })

  // get the total count of failed logins and the timechart of failed logins
  let failed_login_timechart = failed_login_timechart(from, to)
  let failed_login_count = failed_login_timechart.Aggregate(({UserLoginFailed}) => {
    return {
      columns: {
        sum: {total: UserLoginFailed}
      }
    }
  })

  // get the top 10 users that failed to login and the count of failed login attempts
  let top_failed_username = failed_logins.Aggregate(({Username}) => {
    return {
      groupBy: {Username},
      columns: {
        count: {count: true}
      }
    }
  }).Sort(10, "-count")

  return {
    failed_logins,
    changed_passwords,
    failed_login_timechart,
    failed_login_count,
    failed_logins_map,
    top_failed_username
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
 * This method gets all the failed login events over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table of all the failed login events
 */
function failed_login(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.AzureActiveDirectory") and sContent("@fields.Operation", "UserLoginFailed")
    let timestamp = f("@timestamp")
    let {Username="UserId", SourceIP="ClientIP", LoginResult="ResultStatus", LogonError}=f("@fields")
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the failed login timechart
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table of all the failed login events
 */
function failed_login_timechart(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.AzureActiveDirectory") and sContent("@fields.Operation", "UserLoginFailed")
    let timestamp = f("@timestamp")
    let {Operation} = f("@fields")
    timechart {span="1h"} total=count() by Operation
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets all the password changes and resets over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table of all the failed login events
 */
function changed_password(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.AzureActiveDirectory")
    let timestamp = f("@timestamp")
    let {Operation, InitiatedUser="UserId", TargetUser="ObjectId", ResultStatus}=f("@fields")
    where sContent(Operation, "Change user password.") or sContent(Operation, "Reset user password.")
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}
