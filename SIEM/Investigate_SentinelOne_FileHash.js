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

function main({fileHash="79d4d5e18523d532a6833be864d67428ef6aa583"}) {
  let infectedDevices = getFileHashField(fileHash, "-15d@d", "@h", "sourceFqdn")
  let userNames = getFileHashField(fileHash, "-15d@d", "@h", "sourceUserName")
  let fileNames = getFileHashField(fileHash, "-15d@d", "@h", "fileName")
  let hashTimeline = getFileHastTimeline(fileHash, "-15d@d", "@h")
  return {infectedDevices, userNames, fileNames, hashTimeline}
}
