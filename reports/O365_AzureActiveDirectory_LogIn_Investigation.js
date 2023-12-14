/**
 * @file O365_AzureActiveDirectory_LogIn_Investigation
 * @reportoverview An investigation report that gets all the log in activity for a specific user over a specific time range.
 * The report contains an overall table with all the login activities, a geoip table with all the different ip addresses used
 * and tables with the login data grouped by different fields. These tables can be used to create visualizations.
 */

/**
 * Main method. This method calls the AzureActiveDirectory method to get all the log in activity for the user over the time range.
 * Then, the overall table is aggregated to get the geoip information for the different IP addresses and grouped by different fields
 * to get the different statistics in those fields.
 * 
 * @param {string} username - The Office365 username to investigate
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({username, from="-24h@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // get the overall table with all login activity
  let aad = AzureActiveDirectory(username, rangeFrom, rangeTo)

  // aggregate the overall table to get different statistics
  let clientIPStats = aad.Aggregate(({ClientIP, timestamp, OS, BrowserType, DisplayName}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(ClientIP)
    if (isp == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {ClientIP},
      columns: {
        values: {oss: OS},
        values: {bts: BrowserType},
        values: {dns: DisplayName},
        count: {records: true},
        argmax: {
          latest: timestamp,
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
      columns: {
        count: {totalCount: true}
      }
    }
  })
  let userAgentStats = aad.Aggregate(({UserAgent, timestamp, OS, BrowserType, DisplayName}) => {
    return {
      groupBy: {UserAgent},
      columns: {
        max: {latest: timestamp},
        values: {oss: OS},
        values: {bts: BrowserType},
        values: {dns: DisplayName},
        count: {records: true}
      }
    }
  })
  let browserTypeStats = aad.Aggregate(({BrowserType, timestamp, OS, UserAgent, DisplayName}) => {
    return {
      groupBy: {BrowserType},
      columns: {
        max: {latest: timestamp},
        values: {oss: OS},
        values: {uas: UserAgent},
        values: {dns: DisplayName},
        count: {records: true}
      }
    }
  })
  let osStats = aad.Aggregate(({OS, timestamp, BrowserType, UserAgent, DisplayName}) => {
    return {
      groupBy: {OS},
      columns: {
        max: {latest: timestamp},
        values: {bts: BrowserType},
        values: {uas: UserAgent},
        values: {dns: DisplayName},
        count: {records: true}
      }
    }
  })
  let count_RequestType = aad.Aggregate(({RequestType}) => {
    return {
      groupBy: {RequestType},
      columns: {
        count: {count_RequestType: true}
      }
    }
  }).Sort(-1, "count_RequestType")
  let count_ResultStatusDetail = aad.Aggregate(({ResultStatusDetail}) => {
    return {
      groupBy: {ResultStatusDetail},
      columns: {
        count: {count_ResultStatusDetail: true}
      }
    }
  }).Sort(-1, "count_ResultStatusDetail")
  let count_DisplayName = aad.Aggregate(({DisplayName}) => {
    return {
      groupBy: {DisplayName},
      columns: {
        count: {count_DisplayName: true}
      }
    }
  }).Sort(-1, "count_DisplayName")

  return {
    aad,
    clientIPStats,
    uniqueClientIPs,
    userAgentStats,
    browserTypeStats,
    osStats,
    count_RequestType,
    count_ResultStatusDetail,
    count_DisplayName
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
 * This method breaks the time range into intervals of 1 day and uses the template to get the log in activity for the
 * user for each time range then aggregate them into an overall table. The overall table is then returned.
 * 
 * @param {string} username - The Office365 username to investigate
 * @param {Time} rangeFrom - The start of the time range
 * @param {Time} rangeTo - The end of the time range
 * 
 * @returns {Table} table - Returns a table with all the log in activity for the user over the time range
 */
function AzureActiveDirectory(username, rangeFrom, rangeTo) {
  // initialize the table used and query template
  let table = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source","Audit.AzureActiveDirectory") and sContent("@fields.Operation","UserLoggedIn") and sContent("@fields.UserId", "{{.username}}")
    let timestamp = f("@timestamp")
    let EventTime=strftime("%a, %d %b %Y %T %z",timestamp)
    let {ClientIP,Workload} = f("@fields")
    let {OS,BrowserType,DisplayName} = f("@fields.DevicePropertiesFields")
    let {UserAgent,RequestType,ResultStatusDetail} = f("@fields.ExtendedPropertiesFields")
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
