function mimecastSIEMDeliveryLogsByDir(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {Dir}= f("@fields")
    aggregate eventCount=count() by Dir
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {{.field}}= f("@fields.{{.field}}")
    aggregate eventCount=count() by {{.field}}
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsByRoute(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {Route}= f("@fields")
    let Route_fix = condition(len(Route)>0, Route,"-") 
    aggregate eventCount=count() by Route_fix
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsByTls(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {TlsVer}= f("@fields")
    let TlsVer2_fix = condition(len(TlsVer)>0, TlsVer,"None") 
    aggregate eventCount=count() by TlsVer2_fix
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsByRejType(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {RejType}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by RejType
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Inbound")
    let {{.field}} = f("@fields.{{.field}}")
    aggregate eventCount=count() by {{.field}}
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsByAct(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {Act}= f("@fields")
    aggregate eventCount=count() by Act
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsByRejType(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {RejType}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by RejType
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMProcessLogsBySender(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Sender}= f("@fields")
    aggregate eventCount=count() by Sender
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMProcessLogsByAct(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Act}= f("@fields")
    aggregate eventCount=count() by Act
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMProcessLogsByActHistogram(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Act}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by Act
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

function main({from="-24h@h", to="@h"}) {    
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}   
  let deliveryLogsByDir = mimecastSIEMDeliveryLogsByDir(env)
  let deliveryLogsBySenderTop20 = mimecastSIEMDeliveryLogsByField(env.from, env.to, "Sender")
  let deliveryLogsByRcptTop20 = mimecastSIEMDeliveryLogsByField(env.from, env.to, "Rcpt")
  let deliveryLogsByRoute = mimecastSIEMDeliveryLogsByRoute(env)
  let deliveryLogsByTls = mimecastSIEMDeliveryLogsByTls(env)
  let deliveryLogsByRejType = mimecastSIEMDeliveryLogsByRejType(env)
  let receiptLogsBySenderTop20 = mimecastSIEMReceiptLogsByField(env.from, env.to, "Sender")
  let receiptLogsByRcptTop20 = mimecastSIEMReceiptLogsByField(env.from, env.to, "Rcpt")
  let receiptLogsByAct = mimecastSIEMReceiptLogsByAct(env)
  let receiptLogsByRejType = mimecastSIEMReceiptLogsByRejType(env)
  let processLogsBySenderTop20 = mimecastSIEMProcessLogsBySender(env)
  let processLogsByAct = mimecastSIEMProcessLogsByAct(env)
  let processLogsByActHistogram = mimecastSIEMProcessLogsByActHistogram(env)

  return {
    deliveryLogsByDir,
    deliveryLogsBySenderTop20,
    deliveryLogsByRcptTop20,
    deliveryLogsByRoute,
    deliveryLogsByTls,
    deliveryLogsByRejType,
    receiptLogsBySenderTop20,
    receiptLogsByRcptTop20,
    receiptLogsByAct,
    receiptLogsByRejType,
    processLogsBySenderTop20,
    processLogsByAct,
    processLogsByActHistogram
  }
}