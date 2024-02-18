/**
 * @file O365_SharePoint_Files_Investigation
 * @reportoverview An investigation report to get statistics on the files in SharePoint with the specified user id
 * over a specific time range. The main fields used to group the files are the object id, client ip address,
 * operation and user agent of the file.
 */

/**
 * Main method. This method calls sharepointFileTable to get an overall table of all the files in SharePoint with the
 * specified user id. The table is then aggregated into multiple tables grouped by the different fields.
 * 
 * @param {string} username - The user id of the user
 * @param {string || int} from - The start of the time range. Default is the past 2 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({username, from="-2d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // gets the overall sharepoint table
  let spft= sharepointFileTable(username, rangeFrom, rangeTo)

  // aggregates the overall table into multiple tables grouped by the different fields
  let fileObjectStats = spft.Aggregate(({ObjectId, ts, Operation, ClientIP, Workload}) => {
    return {
      groupBy: {ObjectId},
      columns: {
        max: {latest: ts},
        values: {ops: Operation},
        values: {ips: ClientIP},
        values: {wls: Workload},
        count: {records: true}
      }
    }
  })
  let uniqueFiles = fileObjectStats.Aggregate(({}) => {
    return {
      columns:
        {count: {totalCount: true}
      }
    }
  })
  let clientIPStats = spft.Aggregate(({ClientIP, ts, Operation, SourceFileName, UserAgent, Workload}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(ClientIP)
    if (isp == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {ClientIP},
      columns: {
        values: {ops: Operation},
        values: {files: SourceFileName},
        values: {wls: Workload},
        values: {uas: UserAgent},
        count: {records: true},
        argmax: {
          latest: ts,
          country,
          city,
          countryCode,
          isp,
          org,
          latitude,
          longitude
        },
      }
    }
  })
  let uniqueClientIPs = clientIPStats.Aggregate(({}) => {
    return {
      columns: 
        {count: {totalCount: true}
      }
    }
  })
  let operationStats = spft.Aggregate(({Operation, ts, ClientIP, SourceFileName, Workload}) => {
    return {
      groupBy: {Operation},
      columns: {
        max: {latest: ts},
        values: {files: SourceFileName},
        values: {ips: ClientIP},
        values: {wls: Workload},
        count: {records: true}
      }
    }
  })
  let userAgentStats = spft.Aggregate(({UserAgent, ts, ClientIP, SourceFileName, Workload}) => {
    return {
      groupBy: {UserAgent},
      columns: {
        max: {latest: ts},
        dcount: {files: SourceFileName},
        values: {ips: ClientIP},
        values: {wls: Workload},
        count: {records: true}
      }
    }
  })

  return {
    spft,
    fileObjectStats,
    uniqueFiles,
    clientIPStats,
    uniqueClientIPs,
    operationStats,
    userAgentStats
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
 * This method is a helper method to get the overall table of all the files in SharePoint with the specified user id
 * over the time range.
 * 
 * @param {string} username - The user id to be investigated
 * @param {Time} rangeFrom - The start of the time range
 * @param {Time} rangeTo - The end of the the range
 * 
 * @returns {Table} table - Returns a table containing all the files in SharePoint.
 */
function sharepointFileTable(username, rangeFrom, rangeTo) {
  // initialize the table and query template
  let table = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source","Audit.SharePoint") and sContent("@fields.ItemType","File") and sContent("@fields.UserId","{{.username}}")
    let ts = f("@timestamp")
    let EventTime=strftime("%a, %d %b %Y %T %z",ts)
    let {Operation, ClientIP, ApplicationDisplayName, Workload, SourceFileName, SourceFileExtension, ObjectId, UserAgent} = f("@fields")
  `

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {username, from, to}
    table.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }
  return table
}

