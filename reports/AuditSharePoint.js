/**
 * @file AuditSharePoint
 * @reportoverview A summary report that shows the overview of the top Sharepoint activities in the time range
 * grouped by the client IP, operation, user ID, and source file name. The report contains tables with the data obtained
 * from the queries which can be used to create visualizations.
 */

/**
 * Main method. The method calls the topClientIP and topCountByField methods to get the top 10 client IPs, operations,
 * user IDs, and source file names by count for each day in the time range from LavaDB. The tables obtained are then
 * returned as an object.
 * 
 * @param {string || int} from - The start of the time range. Default is 48 hours ago from the past hour
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-48h@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables to be used
  let clientIPs = new Table()
  let operations = new Table()
  let userIDs = new Table()
  let sourceFilenames = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    
    clientIPs.Append(topClientIP(from, to))
    operations.Append(countByField("Operation", from, to))
    userIDs.Append(countByField("UserId", from, to))
    sourceFilenames.Append(countByField("SourceFileName", from, to))
  }

  clientIPs = clientIPs.Aggregate(({ClientIP, count, country, isp, city, countryCode, org, latitude, longitude}) => {
    return {
      groupBy: {ClientIP},
      columns: {
        sum: {count},
        first: {country},
        first: {city},
        first: {countryCode},
        first: {isp},
        first: {org},
        first: {latitude},
        first: {longitude}
      }
    }
  }).Sort(10, "-count")
  operations = topCountByField(operations, "Operation")
  userIDs = topCountByField(userIDs, "UserId")
  sourceFilenames = topCountByField(sourceFilenames, "SourceFileName")

  return {
    clientIPs,
    operations,
    userIDs,
    sourceFilenames
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
 * This method breaks the time range into 1 day intervals and gets the top 10 client IPs by count for each day from LavaDB
 * with their geoip information.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the top 10 client IPs by their event count
 */
function topClientIP(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@source", "Audit.SharePoint")
    let {ClientIP}=f("@fields")
    aggregate count=count() by ClientIP
    let {}=geoip(ClientIP)
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * The method breaks down the time range into 1 day intervals and gets the top 10 of the field by count for each day from LavaDB.
 * 
 * @param {string} field - The field to be grouped by
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table}- Returns a table containing the top 10 of the field by their event count
 */
function countByField(field, from, to) {
  let env = {from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@source", "Audit.SharePoint")
    let {{.field}}=f("@fields.{{.field}}")
    aggregate count=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * The method breaks down the time range into 1 day intervals and gets the top 10 of the field by count for each day from LavaDB.
 * 
 * @param {Table} table - The table containing the data to be grouped by
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} table - Returns a table containing the top 10 of the field by their event count
 */
function topCountByField(table, field) {
  return table.Aggregate((obj) => {
    let fieldValue = obj[field]
    let count = obj.count
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        sum: {count}
      }
    }
  }).Sort(10, "count")
}
