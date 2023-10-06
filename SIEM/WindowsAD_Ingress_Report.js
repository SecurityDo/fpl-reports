function sizeByEventID(env) {
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      let eid=f("@fields.EventID"), size=f("__size__")
      let {Description} = entitylookup(eid, "AD_EventID")
      let eventID = condition(len(Description)>0, eid .. " - " .. Description, eid) 
      aggregate totalSize=sum(size), eventCount=count() by eventID
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
  
function sizeByHostname(env) {
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      let host=f("@fields.Hostname"), size=f("__size__")
      let {sp} = split(host, ".")
      let hostname = tolower(sp)
      aggregate totalSize=sum(size), eventCount=count() by hostname
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

function main({from = "-24h<h", to = "@h"}) {
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  
  let eventIDStats = sizeByEventID(env)
  let hostnameStats = sizeByHostname(env)
  
  let totalADStats = hostnameStats.GroupBy(({totalSize}) => {
      return {
        columns: {
          sum: {totalIngressSize: totalSize},
          count: {hostname: true}
        }
      }
  })
  
  let topADSizeByEventID = eventIDStats.Clone().Sort(10, "totalSize")
  let topADSizeByHostname = hostnameStats.Clone().Sort(10, "totalSize")
  
  return {
    eventIDStats,
    hostnameStats,
    totalADStats,
    topADSizeByEventID,
    topADSizeByHostname
  }
}

