/**
 * @file AzureAD_SignIn_Investigation
 * @reportoverview An investigation report that shows the AzureAD sign in statistics and activity of a specific user over a period of time.
 * The tables shows the different ips, user agents, browsers, operating systems, and authentication methods used by the user and can be 
 * used for visualizations.
 */

/**
 * Main method. This gets the sign in statistics and activity of a specific user over the time range from LavaDB.
 * The tables are sorted by the total number of events based on the different fields.
 * 
 * @param {string} username - The username to search for
 * @param {string || int} from - The start of the time range. Default is past 2 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({username, from="-48h@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables to be used
  let azureSignIn = new Table()
  
  let interval = "1d"
  // breaks the time down into 1 day intervals and gets the total number of sign ins by the specified field
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let from = t
    azureSignIn.Append(fetchAzureSignIn(from, to, username))
  }

  // gets the geoip information of the ip addresses the user used to sign in
  let clientIPStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(ipAddress)
    if (isp == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {ipAddress}, 
      columns: {
        max: {latest: createdDateTime}, 
        values: {cas: clientAppUsed}, 
        values: {oss: operatingSystem}, 
        values: {bts: browser}, 
        values: {dns: userDisplayName}, 
        values: {ams: authMethod}, 
        count: {records: true},
        first: {country},
        first: {city},
        first: {countryCode},
        first: {isp},
        first: {org},
        first: {latitude},
        first: {longitude}
      }}
  })
  
  // gets the total number of unique ip addresses the user used to sign in
  let uniqueClientIPs = clientIPStats.Aggregate(({}) => {
    return {
      columns: {
        count: {totalCount: true}
      }
    }
  })

  // shows the most recent sign in details by the user agent and the number of time the agent was used
  let userAgentStats = azureSignIn.Aggregate(({userAgent, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    return {
      groupBy: {userAgent}, 
      columns: {
        max: {latest: createdDateTime},
        values: {cas: clientAppUsed},
        values: {oss: operatingSystem},
        values: {bts: browser},
        values: {dns: userDisplayName},
        values: {ams: authMethod},
        count: {records: true}
      }
    }
  })

  // shows the most recent sign in details by the browser and the number of time the browser was used
  let browserStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    return {
      groupBy: {browser}, 
      columns: {
        max: {latest: createdDateTime},
        values: {cas: clientAppUsed},
        values: {oss: operatingSystem},
        values: {ips: ipAddress},
        values: {dns: userDisplayName},
        values: {ams: authMethod},
        count: {records: true}
      }
    }
  })

  // shows the most recent sign in details by the operating system and the number of time the operating system was used
  let operatingSystemStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    return {
      groupBy: {operatingSystem}, 
      columns: {
        max: {latest: createdDateTime},
        values: {cas: clientAppUsed},
        values: {bts: browser},
        values: {ips: ipAddress},
        values: {dns: userDisplayName},
        values: {ams: authMethod},
        count: {records: true}
      }
    }
  })

  // shows the most recent sign in details by the authentication method and the number of time the authentication method was used
  let authMethodStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod, authDetail}) => {
    return {
      groupBy: {authMethod},
      columns: {
        max: {latest: createdDateTime},
        values: {cas: clientAppUsed},
        values: {bts: browser},
        values: {ips: ipAddress},
        values: {dns: userDisplayName},
        values: {oss: operatingSystem},
        values: {ams: authDetail},
        count: {records: true}
      }
    }
  })

  return {
    azureSignIn,
    clientIPStats,
    uniqueClientIPs,
    userAgentStats,
    browserStats,
    operatingSystemStats,
    authMethodStats
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
 * This helper function gets all the sign in records of the specified user over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} username - The username to search for
 * 
 * @returns {Table} table - Returns a table containing all Azure sign ins by the user over the time range
 */
function fetchAzureSignIn(from, to, username) {
  let env = {from, to, username}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type","@azureSignIn") and sContent("@azureSignIn.userPrincipalName", "{{.username}}")
    let {userDisplayName, userPrincipalName, appDisplayName, ipAddress, clientAppUsed, authenticationRequirement, createdDateTime, userAgent} = f("@azureSignIn")
    let {operatingSystem, browser}= f("@azureSignIn.deviceDetail")
    let {city, countryOrRegion}= f("@azureSignIn.location")
    let {latitude, longitude}= f("@azureSignIn.location.geoCoordinates")
    let {authMethod, authDetail}= f("@azureSignIn.mfaDetail")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
