function mcafee_by(field) {
  let env = {from: "-8d<d", to: "@d", field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","XML") and sWildcard("@fields.xml.{{.field}}.MachineInfo.MachineName")
    let {UserName, MachineName, OSName,IPAddress} =f("@fields.xml.{{.field}}.MachineInfo")
    aggregate UserNames=values(UserName), OSName=max(OSName), eventCount=count() by MachineName
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mcafee_threats() {
  let env = {from: "-8d<d", to: "@d"}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","XML") and sWildcard("@fields.xml.EPOevent.MachineInfo.MachineName") and sWildcard("@fields.xml.EPOevent.SoftwareInfo._ProductName") and not sContent("@fields.xml.EPOevent.SoftwareInfo._ProductFamily","TVD")
    let {UserName,MachineName,OSName,IPAddress} =f("@fields.xml.EPOevent.MachineInfo")
    let {TargetFileName,TargetProcessName,ThreatActionTaken,ThreatCategory,ThreatEventID,ThreatName,ThreatSeverity} =f("@fields.xml.EPOevent.SoftwareInfo.Event.CommonFields")
    let ThreatEventIdDescription =f("@fields.ThreatEventIdDescription")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mcafee_tvd() {
  let env = {from: "-8d<d", to: "@d"}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","XML") and sContent("@fields.xml.EPOevent.SoftwareInfo._ProductFamily","TVD")
    let {UserName,MachineName,OSName,IPAddress} =f("@fields.xml.EPOevent.MachineInfo")
    let {ThreatCategory,ThreatName,ThreatActionTaken} =f("@fields.xml.EPOevent.SoftwareInfo.Event.CommonFields")
    let Severity =f("@fields.Severity")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main() {
  setEnv("from", "-8d<d")
  setEnv("to", "@d")
  let mcafee_EPOEvent = mcafee_by("EPOEvent")
  let mcafee_EPOevent = mcafee_by("EPOevent")
  let mcafee_MSMERoot = mcafee_by("MSMERoot")
  let mcafee_UpdateEvents = mcafee_by("UpdateEvents")
  let tableTotal = mergeTable(mcafee_EPOEvent, mcafee_EPOevent, mcafee_MSMERoot, mcafee_UpdateEvents).Aggregate(({MachineName, OSName, eventCount}) => {
    return {
      groupBy: {MachineName},
      columns: {
        max: {OSName},
        sum: {eventCount}
      }
    }
  })
  let count_EventCount = tableTotal.Aggregate(({MachineName, eventCount}) => {
    return {
      groupBy: {MachineName},
      columns: {
        sum: {count_EventCount: eventCount}
      }
    }
  }).Sort(10, "-count_EventCount")
  let totalCount = tableTotal.Aggregate(({MachineName}) => {
    return {
      columns: {
        dcount: {total: MachineName}
      }
    }
  })
  let count_OSName = tableTotal.Aggregate(({OSName}) => {
    return {
      groupBy: {OSName},
      columns: {
        count: {count_OSName: true}
      }
    }
  })
  let threatsTable = mcafee_threats()
  let tvdTable = mcafee_tvd()
  return {
    tableTotal,
    count_EventCount,
    totalCount,
    count_OSName,
    threatsTable,
    tvdTable
  }
}