function getData(env) {
  let fplTemplate = `
    search {type="{{.type}}",from="{{.from}}",to="{{.to}}"} sEntityinfo("sip","HOME_NET") and not sEntityinfo("dip","HOME_NET") and not sRange("txB","0","0") and not sRange("rxB","0","0") and not         sRange("dp","5353","5353") and not sRange("dp","443","443") and not sRange("dp","80","80") and not sRange("dp","53","53") and not sRange("dp","0","0")
    let Hostname = f("s_asset.hostname")
    let SourceIP = f("sip")
    let DestIP  = f("dip")
    let DestPort = f("dp")
    let DestCountry = f("d_country")
    let DestOrg = f("d_org")
    let TxB = f("txB")
    let RxB = f("rxB")
    aggregate Count=count(), TotalTxB=sum(TxB), TotalRxB=sum(RxB) by Hostname,SourceIP, DestIP, DestPort, DestCountry, DestOrg
    table Hostname, SourceIP, DestIP, DestPort, DestCountry, DestOrg, TotalTxB, TotalRxB, Count
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function getPorts(env) {
  let fplTemplate = `
    search {type="{{.type}}",from="{{.from}}",to="{{.to}}"} sEntityinfo("sip","HOME_NET") and not sEntityinfo("dip","HOME_NET") and not sRange("txB","0","0") and not sRange("rxB","0","0") and not         sRange("dp","5353","5353") and not sRange("dp","443","443") and not sRange("dp","80","80") and not sRange("dp","53","53") and not sRange("dp","0","0")
    let DestPort = f("dp")
    aggregate Count=count() by DestPort
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function getSourceIPs(env) {
  let fplTemplate = `
    search {type="{{.type}}",from="{{.from}}",to="{{.to}}"} sEntityinfo("sip","HOME_NET") and not sEntityinfo("dip","HOME_NET") and not sRange("txB","0","0") and not sRange("rxB","0","0") and not         sRange("dp","5353","5353") and not sRange("dp","443","443") and not sRange("dp","80","80") and not sRange("dp","53","53") and not sRange("dp","0","0")
    let SourceIP = f("sip")
    aggregate Count=count() by SourceIP
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main() {
  let env = {from: "-7d@d", to: "@d", type: "metaflow"}
  let data = getData(env)
  let ports = getPorts(env)
  let sourceIPs = getSourceIPs(env)
  let topSourceIPs = sourceIPs.Clone().Sort(10, "-Count")

  return {data, ports, sourceIPs, topSourceIPs}
}