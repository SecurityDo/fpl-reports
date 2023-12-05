function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from="-7d<d", to="@d", hostname, policyid}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to, hostname, policyid}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","OSFirewall")
    let {rule_id, host_name} = f("@os_firewall")
    assign _time=f("@timestamp")
    where sContent(rule_id,"{{.policyid}}") and sStartswith(host_name,"{{.hostname}}")
    aggregate rule_id=count() by timeslot=timebucket("1d", _time)
    assign iso2822=strftime("%a, %d %b %Y %T %z", timeslot)
    table iso2822, rule_id
  `
  let usage = fluencyLavadbFpl(template(fplTemplate, env))
  return {usage}
}