function EventsBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    aggregate totalevents = count() by {{.field}}
    sort 20 totalevents
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function BandwidthBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    let {sent,rcvd} = f("@sonicwall")
    let psent = parseInt(sent)
    let prcvd = parseInt(rcvd)
    let total = psent + prcvd
    aggregate totalbytes = sum(total) by {{.field}}
    sort 100 totalbytes
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function HTTPEventsBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    let {proto} = f("@sonicwall")
    where proto=="tcp/https"
    aggregate totalevents = count() by {{.field}}
    sort 20 totalevents
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function HTTPBandwidthBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    let {proto, sent,rcvd} = f("@sonicwall")
    where proto=="tcp/https"
    let psent = parseInt(sent)
    let prcvd = parseInt(rcvd)
    let total = psent + prcvd
    aggregate totalbytes = sum(total) by {{.field}}
    sort 20 totalbytes
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main({sip, from="-7d@d", to="@h"}) {
  let dipEvents = EventsBy(sip, from, to, "dip")
  let dipBandwidth = BandwidthBy(sip, from, to, "dip")
  let serviceEvents = EventsBy(sip, from, to, "proto")
  let serviceBandwidth = BandwidthBy(sip, from, to, "proto")
  let dipHTTPEvents = HTTPEventsBy(sip, from, to, "dip")
  let dipHTTPBandwidth = HTTPBandwidthBy(sip, from, to, "dip")
  let dstNameHTTPBandwidth = HTTPBandwidthBy(sip, from, to, "dstname")
  let categoryHTTPBandwidth = HTTPBandwidthBy(sip, from, to, "Category")
  let dCountryBandwidth = dipBandwidth.Aggregate(({dip, totalbytes}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(dip)
    return {
      groupBy: {country},
      columns: {
        first: {dip},
        sum: {totalbytes},
        first: {city},
        first: {countryCode},
        first: {isp},
        first: {org},
        first: {latitude},
        first: {longitude}
      }
    }
  }).Sort(20, "-totalbytes")
  let httpDCountryBandwidth = dipHTTPBandwidth.Aggregate(({dip, totalbytes}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(dip)
    return {
      groupBy: {country},
      columns: {
        first: {dip},
        sum: {totalbytes},
        first: {city},
        first: {countryCode},
        first: {isp},
        first: {org},
        first: {latitude},
        first: {longitude}
      }
    }
  }).Sort(20, "-totalbytes")
  return {dipEvents, dipBandwidth, serviceEvents, serviceBandwidth, dipHTTPEvents, dipHTTPBandwidth, dstNameHTTPBandwidth, categoryHTTPBandwidth, dCountryBandwidth, httpDCountryBandwidth}
}