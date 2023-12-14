/**
 * @file Print_Server_Log_Report
 * @reportoverview An investigation report to get the server logs associated with the specific user
 * over the time range.
 */

/**
 * Main method. This method uses the template to get all server logs associated with the specific user
 * over the time range.
 * 
 * @param {string || int} from - The start of the time range. Default is the past 3 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-3d@m", to="@m", username}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the table and template query to be used
  let logs = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","nxlogAD") and sContent("@fields.EventID","307") and sContent("@fields.AccountName","{{.username}}")
    let {Hostname, AccountName, DocumentName="DocumentPrinted.Param2", Client="DocumentPrinted.Param4", Printer="DocumentPrinted.Param5"} = f("@fields")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    table iso2822, AccountName, DocumentName, Client, Hostname, Printer
  `

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      let env = {from, to, username}
      logs.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }

  return {logs}
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