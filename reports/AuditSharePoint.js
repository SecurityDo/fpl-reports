function topClientIP(env) {
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@source", "Audit.SharePoint")
    let {ClientIP}=f("@fields")
    aggregate count=count() by ClientIP
    sort 10 count
    let {}=geoip(ClientIP)
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function topOperation(env) {
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@source", "Audit.SharePoint")
    let {Operation}=f("@fields")
    aggregate count=count() by Operation
    sort 10 count
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function topUserID(env) {
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@source", "Audit.SharePoint")
    let {UserId}=f("@fields")
    aggregate count=count() by UserId
    sort 10 count
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function topSourceFilename(env) {
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@source", "Audit.SharePoint")
    let {SourceFileName}=f("@fields")
    aggregate count=count() by SourceFileName
    sort 10 count
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

function main({from="-48h>h", to=">h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let clientIPs = topClientIP(env)
  let operations = topOperation(env)
  let userIDs = topUserID(env)
  let sourceFilenames = topSourceFilename(env)

  return {clientIPs, operations, userIDs, sourceFilenames}
}