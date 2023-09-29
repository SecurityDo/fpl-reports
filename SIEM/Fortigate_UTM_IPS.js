function histogram_by_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = ""
  if (field == "srccountry") {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {srccountry}=f("@fortigate"), timestamp=f("@timestamp")
      where not sContent(srccountry,"Reserved")
      timechart {span="1h", limit=10} total=count() by srccountry
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {{.field}}=f("@fortigate.{{.field}}"), timestamp=f("@timestamp")
      timechart {span="1h", limit=10} total=count() by {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function fortigate_utm_ips_by_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = ""
  if (field == "srccountry") {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {srccountry}=f("@fortigate")
      where not sContent(srccountry,"Reserved")
      aggregate total=count() by srccountry
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
      let {{.field}}=f("@fortigate.{{.field}}")
      aggregate total=count() by {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function fortigate_utm_ips_by_attack(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate") and sContent("@fortigate.type","utm") and sContent("@fortigate.subtype","ips")
    let {attack, severity}=f("@fortigate")
    aggregate total=count(), severity=max(severity) by attack
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

function main({from="-5d<h", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  
  let attack_histogram = histogram_by_field(from, to, "attack")
  let action_histogram = histogram_by_field(from, to, "action")
  let src_histogram = histogram_by_field(from, to, "srccountry")

  let attack_table = fortigate_utm_ips_by_attack(from, to)
  let country_table = fortigate_utm_ips_by_field(from, to, "srccountry")
  let action_table = fortigate_utm_ips_by_field(from, to, "action")
  let profile_table = fortigate_utm_ips_by_field(from, to, "profile")
  let level_table = fortigate_utm_ips_by_field(from, to, "level")

  return {
    attack_histogram,
    action_histogram,
    src_histogram,
    attack_table,
    country_table,
    action_table,
    profile_table,
    level_table
  }
}