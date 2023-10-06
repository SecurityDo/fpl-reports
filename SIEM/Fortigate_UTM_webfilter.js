function fortigate_utm_webfilter(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","fortigate")
    let {type,subtype,eventtype,level,vd,msg,action,hostname}=f("@fortigate")
    where type=="utm" and subtype=="webfilter"
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function aggregate_webfilter_by_field(webfilter_table, field) {
  return webfilter_table.Aggregate((obj) => {
    let fieldValue = obj[field]
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        count: {totalCount: true}
      }
    }
  })
}

function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from="-24h<h", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let webfilter_table = fortigate_utm_webfilter(env)
  let count_webfilter_by_eventtype = aggregate_webfilter_by_field(webfilter_table, "eventtype")
  let count_webfilter_by_level = aggregate_webfilter_by_field(webfilter_table, "level")
  let count_webfilter_by_vd = aggregate_webfilter_by_field(webfilter_table, "vd")
  let count_webfilter_by_msg = aggregate_webfilter_by_field(webfilter_table, "msg")
  let top10_webfilter_by_msg = count_webfilter_by_msg.Clone().Sort(10, "-totalCount")
  let count_webfilter_by_action = aggregate_webfilter_by_field(webfilter_table, "action")
  let count_webfilter_by_hostname = aggregate_webfilter_by_field(webfilter_table, "hostname")
  let top10_webfiler_by_hostname = count_webfilter_by_hostname.Clone().Sort(10, "-totalCount")
  return {
    count_webfilter_by_eventtype,
    count_webfilter_by_level,
    count_webfilter_by_vd,
    count_webfilter_by_msg,
    top10_webfilter_by_msg,
    count_webfilter_by_action,
    count_webfilter_by_hostname,
    top10_webfiler_by_hostname
  }
}