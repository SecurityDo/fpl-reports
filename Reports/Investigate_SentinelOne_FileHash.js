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

function getFileHashField(fileHash, from, to, field) {
  let env = {fileHash, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@tags","SentinelOne") and sContent("@sentinelone.fileHash","{{.fileHash}}")
    let {{.field}}=f("@sentinelone.{{.field}}")
    aggregate sourceFqdn=values({{.field}}),count=count() by {{.field}}
    table sourceFqdn
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

function main({fileHash, from="-15d<d", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let infectedDevices = getFileHashField(fileHash, from, to, "sourceFqdn")
  let userNames = getFileHashField(fileHash, from, to, "sourceUserName")
  let fileNames = getFileHashField(fileHash, from, to, "fileName")
  let hashTimeline = getFileHastTimeline(fileHash, from, to,)
  return {
    infectedDevices,
    userNames,
    fileNames,
    hashTimeline
  }
}