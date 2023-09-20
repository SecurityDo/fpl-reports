function mimecastSIEMDeliveryLogsByDir(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {Dir}= f("@fields")
    aggregate eventCount=count() by Dir
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsBySender(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Inbound")
    let {Sender}= f("@fields")
    aggregate eventCount=count() by Sender
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsByRcpt(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {Rcpt}= f("@fields")
    aggregate eventCount=count() by Rcpt
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMDeliveryLogsByRoute(from, to) {
  let env = {from, to}
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

function mimecastSIEMDeliveryLogsByTls(from, to) {
  let env = {from, to}
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

function mimecastSIEMDeliveryLogsByRejType(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "delivery") and not sContent("@fields.Dir", "External")
    let {RejType}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by RejType
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsBySender(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Inbound")
    let {Sender}= f("@fields")
    aggregate eventCount=count() by Sender
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsByRcpt(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {Rcpt}= f("@fields")
    aggregate eventCount=count() by Rcpt
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsByAct(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {Act}= f("@fields")
    aggregate eventCount=count() by Act
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMReceiptLogsByRejType(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "receipt") and not sContent("@fields.Dir", "External") and not sContent("@fields.Dir", "Outbound")
    let {RejType}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by RejType
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMProcessLogsBySender(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Sender}= f("@fields")
    aggregate eventCount=count() by Sender
    sort 20 eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMProcessLogsByAct(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Act}= f("@fields")
    aggregate eventCount=count() by Act
    sort eventCount
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function mimecastSIEMProcessLogsByActHistogram(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "mimecast") and sContent("@fields.api", "/api/audit/get-siem-logs") and sContent("@fields.msg_stage", "process")
    let {Act}= f("@fields"), timestamp=f("@timestamp")
    timechart {span="1d"} eventCount=count() by Act
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main() {
  let deliveryLogsByDir = mimecastSIEMDeliveryLogsByDir("-7d@d", "@d")
  let deliveryLogsBySenderTop20 = mimecastSIEMDeliveryLogsBySender("-7d@d", "@d")
  let deliveryLogsByRcptTop20 = mimecastSIEMDeliveryLogsByRcpt("-7d@d", "@d")
  let deliveryLogsByRoute = mimecastSIEMDeliveryLogsByRoute("-7d@d", "@d")
  let deliveryLogsByTls = mimecastSIEMDeliveryLogsByTls("-7d@d", "@d")
  let deliveryLogsByRejType = mimecastSIEMDeliveryLogsByRejType("-7d@d", "@d")
  let receiptLogsBySenderTop20 = mimecastSIEMReceiptLogsBySender("-7d@d", "@d")
  let receiptLogsByRcptTop20 = mimecastSIEMReceiptLogsByRcpt("-7d@d", "@d")
  let receiptLogsByAct = mimecastSIEMReceiptLogsByAct("-7d@d", "@d")
  let receiptLogsByRejType = mimecastSIEMReceiptLogsByRejType("-7d@d", "@d")
  let processLogsBySenderTop20 = mimecastSIEMProcessLogsBySender("-7d@d", "@d")
  let processLogsByAct = mimecastSIEMProcessLogsByAct("-7d@d", "@d")
  let processLogsByActHistogram = mimecastSIEMProcessLogsByActHistogram("-7d@d", "@d")

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