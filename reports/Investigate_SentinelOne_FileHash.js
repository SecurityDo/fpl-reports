/**
 * @file Investigate_SentinelOne_FileHash
 * @reportoverview An investigation report that shows the timeline of a specific file hash as well as the usernames,
 * file names and infected devices associated with the file hash.
 */

/**
 * Main method. This method calls getFileHashField to get the number of events associated with a specific file hash
 * grouped by the fields and getFileHashTimeline to get the timeline of the file hash.
 * 
 * @param {string} fileHash - The sentinelone file hash to investigate
 * @param {string || int} from - The start of the time range. Default is last 15 days
 * @param {string || int} to - The end of the time range. Default is the past day
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({fileHash, from="-15d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the table used
  let infectedDevices = new Table()
  let userNames = new Table()
  let fileNames = new Table()
  let hashTimeline = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 days and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    infectedDevices.Append(getFileHashField(fileHash, from, to, "sourceFqdn"))
    userNames.Append(getFileHashField(fileHash, from, to, "sourceUserName"))
    fileNames.Append(getFileHashField(fileHash, from, to, "fileName"))
    hashTimeline.Append(getFileHastTimeline(fileHash, from, to))
  }

  // gets the list of values of the fields for the infected devices
  infectedDevices = infectedDevices.Aggregate(({sourceFqdn}) => {
    return {
      columns: {
        values: {sourceFqdn}
      }
    }
  })
  userNames = userNames.Aggregate(({sourceFqdn, sourceUserName}) => {
    return {
      groupBy: {sourceUserName},
      columns: {
        values: {sourceFqdn}
      }
    }
  }).RemoveColumn("sourceUserName")
  fileNames = fileNames.Aggregate(({sourceFqdn, fileName}) => {
    return {
      groupBy: {fileName},
      columns: {
        values: {sourceFqdn}
      }
    }
  }).RemoveColumn("fileName")
  
  return {
    infectedDevices,
    userNames,
    fileNames,
    hashTimeline
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
 * 
 * @param {string} fileHash - The sentinelone file hash to investigate
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the timeline of the file hash
 */
function getFileHastTimeline(fileHash, from, to) {
  let env = {fileHash, from, to}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@tags","SentinelOne") and sContent("@sentinelone.fileHash","{{.fileHash}}")
    let {sourceFqdn,sourceUserName,fileName,filePath}=f("@sentinelone")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    sort timestamp
    aggregate iso2822=values(iso2822),count=count(),sourceUserName=values(sourceUserName),filePath=values(filePath) by timestamp, sourceFqdn, fileName
    table iso2822, sourceFqdn,sourceUserName,fileName,count,filePath
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * 
 * @param {string} fileHash - The sentinelone file hash to investigate
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to get the number of events of
 * 
 * @returns {Table} table - Returns a table containing the number of events of the field
 */
function getFileHashField(fileHash, from, to, field) {
  let env = {fileHash, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@tags","SentinelOne") and sContent("@sentinelone.fileHash","{{.fileHash}}")
    let {{.field}}=f("@sentinelone.{{.field}}")
    aggregate sourceFqdn=values({{.field}}) by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}