/**
 * @file AD_Accounts_Lockout_report
 * @reportoverview A summary report that shows the overview of incorrect password aattempts and accounts locked out
 * in the time range. The report contains an overall table of the incorrect password attempts and accounts locked out
 * as well as charts that summarizes the data.
 */

/**
 * Main method. This gets the incorrect password attempts and accounts locked out in the time range from LavaDB. Then,
 * aggregates the data by the user.
 * 
 * @param {string || int} from - The start of the time range. Default is past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-1d<m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables to be used
  let failed_login = new Table()
  let locked_out = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    failed_login.Append(getFailedLogin(from, to))
    locked_out.Append(getLockedOut(from, to))
  }

  // get the count and top 20 users that failed to login and got locked out
  let failed_login_by_user = failed_login.Aggregate(({Username}) => {
    return {
      groupBy: {Username},
      columns: {
        count: {count: true}
      }
    }
  }).Sort(20, "-count")

  let locked_out_by_user = locked_out.Aggregate(({Username}) => {
    return {
      groupBy: {Username},
      columns: {
        count: {count: true}
      }
    }
  }).Sort(20, "-count")

  return {
    failed_login,
    locked_out,
    failed_login_by_user,
    locked_out_by_user
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
 * This method gets the failed login attempts in the time range from LavaDB.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the list of accounts
 */
function getFailedLogin(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","nxlogAD") and sContent("@fields.EventID","4625") and sContent("@fields.FailureReason", "%%2313")
      let Timestamp = f("@timestamp")
      let {Username="SubjectUserName", Hostname, IpAddress} = f("@fields")
    `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets the accounts locked out in the time range from LavaDB.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the list of accounts
 */
function getLockedOut(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","nxlogAD") and sContent("@fields.EventID","4740")
      let Timestamp = f("@timestamp")
      let {Username="TargetUserName", Hostname, TargetDomainName} = f("@fields")
    `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
