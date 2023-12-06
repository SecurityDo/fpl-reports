function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from="-1d<d", to="@d"}) {
  validateTimeRange(new Time(from), new Time(to))
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type","duoAuthLog")
    let {TargetHost="access_device.hostname", ClientIP="access_device.ip", Application="application.name", AuthDeviceName="auth_device.name", AuthDeviceIP="auth_device.ip", AuthDeviceCity="auth_device.location.city", AuthDeviceCountry="auth_device.location.country", Email="email", EventType="event_type", Factor="factor", ISOTimestamp="isotimestamp", Reason="reason", Result="result", User="user.name"} = f("@duoAuthLog")
    let timestamp=f("@timestamp")
    assign iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    table iso2822, EventType, Application, User, Email, TargetHost, Result, Reason, Factor, AuthDeviceName, AuthDeviceIP, AuthDeviceCountry, AuthDeviceCity, ISOTimestamp
  `
  let signIns = fluencyLavadbFpl(template(fplTemplate, env))
  return {signIns}
}