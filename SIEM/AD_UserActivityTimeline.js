function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}  

function main({username, from="-7d<d", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("from", to)
  let env = {username, from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","nxlogAD") and not sContent("@fields.EventID","5379") and not sContent("@fields.EventID","5061") and not sContent("@fields.EventID","5059") and not sContent("@fields.EventID","5058") and (sContent("@fields.SubjectUserName", "{{.username}}") or sContent("@fields.TargetUserName", "{{.username}}"))
    let {EventID,  SubjectUserName, TargetUserName, LogonID="TargetLogonId", IP_Address="IpAddress", Hostname, DomainName="TargetDomainName"}=f("@fields")
    let {Description}=entitylookup(EventID,"AD_EventID")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    sort 1000 timestamp
    table iso2822, EventID, Description, SubjectUserName, TargetUserName, LogonID, IP_Address, Hostname, DomainName
  `
  let activityTable = fluencyLavadbFpl(template(fplTemplate, env))
  return {activityTable}
}