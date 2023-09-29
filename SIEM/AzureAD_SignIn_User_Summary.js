function loginByApp(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type","@azureSignIn") and sContent("@azureSignIn.userPrincipalName", "{{.username}}") and sContent("@azureSignIn.status.errorCode", "0")
    let {username="userPrincipalName", clientApp="appDisplayName", city="location.city"} = f("@azureSignIn")
    aggregate  count=count(), cities=values(city) by clientApp
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function loginByLocation(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type","@azureSignIn") and sContent("@azureSignIn.userPrincipalName", "{{.username}}") and sContent("@azureSignIn.status.errorCode", "0")
    let {IP="ipAddress"} = f("@azureSignIn")
    let {city, country="countryOrRegion", state,latitude="geoCoordinates.latitude", longitude="geoCoordinates.longitude"} = f("@azureSignIn.location") 
    aggregate  count=count(), city=max(city), country=max(country), state=max(state), latitude=max(latitude), longitude=max(longitude) by IP
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

function main({username, from="-48h@h", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  let env = {from, to, username}
  setEnv("from", from)
  setEnv("to", to)
  let clientApp = loginByApp(env)
  let locations = loginByLocation(env)
  return {
    clientApp,
    locations
  }
}