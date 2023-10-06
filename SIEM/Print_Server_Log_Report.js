function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from="-7d<d", to="@d", username}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to, username}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","nxlogAD") and sContent("@fields.EventID","307")
    let {Hostname, AccountName, DocumentName="DocumentPrinted.Param2", Client="DocumentPrinted.Param4", Printer="DocumentPrinted.Param5"} = f("@fields")
    let timestamp=f("@timestamp")
    where sContent(AccountName,"{{.username}}")
    assign iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    table iso2822, AccountName, DocumentName, Client, Hostname, Printer
  `
  let logs = fluencyLavadbFpl(template(fplTemplate, env))
  return {logs}
}