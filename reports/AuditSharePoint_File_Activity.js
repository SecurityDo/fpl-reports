/**
 * @file AuditSharePoint_File_Activity
 * @reportoverview A summary report that shows the audit sharepoint files activity over a time range.The report contains 
 * a table with the the lsit of audit sharepoint files activity obtained from LavaDB which can be used to create visualizations.
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the audit sharepoint files for each day from LavaDB.
 * The query only gets OneDrive and SharePoint workloads with the operations FileDownloaded, FileUploaded, and FileDeleted.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-24h@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("from", to)
  let interval = "1d"
  
  let table = new Table()
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {from, to}
    let fplTemplate = `
      search { from="{{.from}}", to="{{.to}}"  } sContent("@source", "Audit.SharePoint") and sContent("@fields.Workload","OneDrive") or sContent("@fields.Workload","SharePoint") 
      let {Operation, CreationTime, SourceFileName, UserId, SourceRelativeUrl} = f("@fields")
      let {ClientAppName} = f("@fields.AppAccessContext")
      let {isp, city, country} = f("@fields._ip")
      where sContent(Operation,"FileDownloaded") or sContent(Operation,"FileUploaded") or sContent(Operation,"FileDeleted")
      sort +Operation, +CreationTime, +SourceFileName
    `
    table.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }

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
