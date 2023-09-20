function fetchAzureSignIn(env) {
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

function main({username, from="-48h@h", to="@h"}) {
  let env = {from, to, username}
  let azureSignIn = fetchAzureSignIn(env)
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
  
  let uniqueClientIPs = clientIPStats.Aggregate(({}) => {
    return {columns: {count: {totalCount: true}}}
  })
  let userAgentStats = azureSignIn.Aggregate(({userAgent, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    return {
      groupBy: {userAgent}, 
      columns: {max: {latest: createdDateTime}, values: {cas: clientAppUsed}, values: {oss: operatingSystem}, values: {bts: browser}, values: {dns: userDisplayName}, values: {ams: authMethod}, count: {records: true}}}
  })
  let browserStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    return {
      groupBy: {browser}, 
      columns: {max: {latest: createdDateTime}, values: {cas: clientAppUsed}, values: {oss: operatingSystem}, values: {ips: ipAddress}, values: {dns: userDisplayName}, values: {ams: authMethod}, count: {records: true}}}
  })
  let operatingSystemStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod}) => {
    return {
      groupBy: {operatingSystem}, 
      columns: {max: {latest: createdDateTime}, values: {cas: clientAppUsed}, values: {bts: browser}, values: {ips: ipAddress}, values: {dns: userDisplayName}, values: {ams: authMethod}, count: {records: true}}}
  })
  let authMethodStats = azureSignIn.Aggregate(({ipAddress, createdDateTime, clientAppUsed, operatingSystem, browser, userDisplayName, authMethod, authDetail}) => {
    return {
      groupBy: {authMethod},
      columns: {max: {latest: createdDateTime}, values: {cas: clientAppUsed}, values: {bts: browser}, values: {ips: ipAddress}, values: {dns: userDisplayName}, values: {oss: operatingSystem},values: {ams: authDetail}, count: {records: true}}}
  })

  return {azureSignIn, clientIPStats, uniqueClientIPs, userAgentStats, browserStats, operatingSystemStats, authMethodStats}
}