function AzureActiveDirectory(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source","Audit.AzureActiveDirectory") and sContent("@fields.Operation","UserLoggedIn") and sContent("@fields.UserId", "{{.username}}")
    let timestamp = f("@timestamp")
    let EventTime=strftime("%a, %d %b %Y %T %z",timestamp)
    let {ClientIP,Workload} = f("@fields")
    let {OS,BrowserType,DisplayName} = f("@fields.DevicePropertiesFields")
    let {UserAgent,RequestType,ResultStatusDetail} = f("@fields.ExtendedPropertiesFields")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main({username, from="-24h@h", to="@h"}) {
  let env = {username, from, to}
  let aad = AzureActiveDirectory(env)
  let clientIPStats = aad.Aggregate(({ClientIP, timestamp, OS, BrowserType, DisplayName}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(ClientIP)
    if (isp == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {ClientIP},
      columns: {
        max: {latest: timestamp},
        values: {oss: OS},
        values: {bts: BrowserType},
        values: {dns: DisplayName},
        count: {records: true},
        first: {country},
        first: {city},
        first: {countryCode},
        first: {isp},
        first: {org},
        first: {latitude},
        first: {longitude}
      }
    }
  })
  let uniqueClientIPs = clientIPStats.Aggregate(({}) => {
    return {columns: {count: {totalCount: true}}}
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
  return {aad, clientIPStats, uniqueClientIPs, userAgentStats, browserTypeStats, osStats, count_RequestType, count_ResultStatusDetail, count_DisplayName}
}