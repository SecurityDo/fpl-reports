/**
 * @file AzureAD_SignIn_User_Summary
 * @reportoverview A summary report that shows the AzureAD sign in statistics and activity of a specific user over a period of time.
 * The report gives an overview of the different client applications and locations the user signed in from. The tables in the report
 * are grouped by IP address and client application and can be used for visualizations.
 */

/**
 * Main method. This gets the sign in statistics and activity of a specific user over the time range from LavaDB.
 * The tables are sorted by the total number of events based on the different fields.
 * 
 * @param {string} username - The username to search for
 * @param {string || int} from - The start of the time range. Default is past 2 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({username, from="-48h@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables
  let clientApp = new Table()
  let locations = new Table()

  let interval = "1d"
  // breaks the time down into 1 day intervals and gets the total number of sign ins by client application and location
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let from = t
    let env = {from, to, username}
    clientApp.Append(loginByApp(env))
    locations.Append(loginByLocation(env))
  }

  // gets the total number of sign ins by the user with the client app and all the cities the user signed in from
  clientApp.Aggregate(({clientApp, count, cities, username}) => {
    return {
      groupBy: {clientApp},
      columns: {
        first: {username},
        sum: {count},
        values: {cities}
      }
    }
  })

  // gets the total number of sign ins by the user with the ip address and all the location information of the ip address
  locations.Aggregate(({IP, count, city, country, state, latitude, longitude}) => {
    return {
      groupBy: {IP},
      columns: {
        sum: {count},
        first: {city},
        first: {country},
        first: {state},
        first: {latitude},
        first: {longitude}
      }
    }
  })

  return {
    clientApp,
    locations
  }
}

/**
 * Thie method is a helper method to validate the time range passed by the user.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {boolean} - Returns true if the time range is valid
 */
function validateTimeRange(from, to) {
  // checks to see if the start of the time range is after the end of the time range
  if (from.After(to)) {
      throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  // checks to see if the time range is more than 2 months
  if (to.After(from.Add("60d"))) {
      throw new Error("total duration must not exceed 2 months", "RangeError")
  }
  return true
}

/**
 * This method groups the sign ins made by the user by client application and gets the total number of sign ins made using the
 * client application.
 * 
 * @param {object} env - contains the time range and the username used for the query
 *  
 * @returns {Table} table - Returns a table containing the total number of sign ins by client application
 */
function loginByApp(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type","@azureSignIn") and sContent("@azureSignIn.userPrincipalName", "{{.username}}") and sContent("@azureSignIn.status.errorCode", "0")
    let {username="userPrincipalName", clientApp="appDisplayName", city="location.city"} = f("@azureSignIn")
    aggregate  count=count(), cities=values(city) by clientApp
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method groups the sign ins made by the user by ip address and gets the location information of the ip address. It
 * also gets the total number of sign ins made on the ip address.
 * 
 * @param {object} env - contains the time range and the username used for the query
 *  
 * @returns {Table} table - Returns a table containing the total number of sign ins by location and client IP
 */
function loginByLocation(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type","@azureSignIn") and sContent("@azureSignIn.userPrincipalName", "{{.username}}") and sContent("@azureSignIn.status.errorCode", "0")
    let {IP="ipAddress"} = f("@azureSignIn")
    let {city, country="countryOrRegion", state, latitude="geoCoordinates.latitude", longitude="geoCoordinates.longitude"} = f("@azureSignIn.location") 
    aggregate count=count(), city=max(city), country=max(country), state=max(state), latitude=max(latitude), longitude=max(longitude) by IP
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
