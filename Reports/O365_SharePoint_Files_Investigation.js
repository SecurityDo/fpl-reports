function sharepointFileTable(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source","Audit.SharePoint") and sContent("@fields.ItemType","File") and sContent("@fields.UserId","{{.username}}")
    let ts = f("@timestamp")
    let EventTime=strftime("%a, %d %b %Y %T %z",ts)
    let {Operation, ClientIP, ApplicationDisplayName, Workload, SourceFileName, SourceFileExtension, ObjectId, UserAgent} = f("@fields")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({username, from="-48h@h", to="@h"}) {
  let rangeFrom = new Time("-30d<d")
  let rangeTo = new Time("@d")
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)
  let env = {username, from, to}
  let spft= sharepointFileTable(env)
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
    return {columns: {count: {totalCount: true}}}
  })
  let clientIPStats = spft.Aggregate(({ClientIP, ts, Operation, SourceFileName, UserAgent, Workload}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(ClientIP)
    if (isp == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {ClientIP},
      columns: {
        max: {latest: ts},
        values: {ops: Operation},
        values: {files: SourceFileName},
        values: {wls: Workload},
        values: {uas: UserAgent},
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