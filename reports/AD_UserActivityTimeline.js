/**
 * @file AD_UserActivityTimeline
 * @reportoverview An investigation report that shows the user activity timeline of the user specified over a time range.
 * The report contains the activity timeline table obtained from LavaDB which can be used to create visualizations.
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the activity timeline for each day from LavaDB.
 * The query drops the events with EventID 5379, 5061, 5059, and 5058 because they are not relevant to the investigation.
 * 
 * @param {string} username - The Azure AD username to be investigated
 * @param {string || int} from - The start of the time range. Default is 1 day ago from the past hour
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({username, from="-1d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)

  // initializes the table and query used
  let activityTable = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","nxlogAD") and (sContent("@fields.SubjectUserName", "{{.username}}") or sContent("@fields.TargetUserName", "{{.username}}"))
    let {EventID, SubjectUserName, TargetUserName, LogonID="TargetLogonId", IP_Address="IpAddress", Hostname, DomainName="TargetDomainName"}=f("@fields")
    let {Description}=entitylookup(EventID,"AD_EventID")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    where not sContent(EventID, "5379") and not sContent(EventID, "5061") and not sContent(EventID, "5059") and not sContent(EventID, "5058")
    sort 1000 timestamp
    table iso2822, EventID, Description, SubjectUserName, TargetUserName, LogonID, IP_Address, Hostname, DomainName
  `

  // breaks the time down into 1 day intervals and gets the activity timeline for each day
  let interval = "1d"
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {username, from, to}
    activityTable.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }

  return {activityTable}
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