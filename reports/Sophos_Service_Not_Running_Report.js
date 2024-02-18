/**
 * @file Sophos_Service_Not_Running_Report
 * @reportoverview A summary report for the failed updates in Sophos. The report contains an overall table that
 * lists all failed update events. The overall table is processed to get the top count by machine name and IP address.
 * The report also contains a timechart that shows the number of failures over time.
 */

/**
 * Main method. This method gets the list of all Sophos services that are not running and then process them into top count
 * tables based on the different fields. The method also gets the timechart data for the number of failures over time.
 * 
 * @param {string || int} from - The start of the time range. Default is the past 3 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-3d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the tables to be used
  let TotalFailedUpdates = new Table()
  let TimeChart = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      let env = {from, to}
      TotalFailedUpdates.Append(getData(env))
      TimeChart.Append(getTimeData(env))
  }

  // process the overall table
  let FailureCount = TotalFailedUpdates.Aggregate(() => {
    return {
      columns: {
        count: {TotalCount: true}
      }
    }
  })
  let TopCountByMachineName = TotalFailedUpdates.Aggregate(({MachineName}) => {
    return {
      groupBy: {MachineName},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let TopCountByIPAddress = TotalFailedUpdates.Aggregate(({IPAddress}) => {
    return {
      groupBy: {IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let AllCountByMachineNameAndIPAddress = TotalFailedUpdates.Aggregate(({MachineName, IPAddress}) => {
    return {
      groupBy: {MachineName, IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(0, "-Count")

  return {
    TotalFailedUpdates,
    FailureCount,
    TopCountByMachineName,
    TopCountByIPAddress,
    AllCountByMachineNameAndIPAddress,
    TimeChart
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
 * This method is a helper method to get the data for the overall table over the time interval
 * specified in env.
 * 
 * @param {object} env - The environmental variables to be used in the FPL query
 *  
 * @returns {Table} table - Returns a table containing the failed update events
 */
function getData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@sophos.type","Event::Endpoint::ServiceNotRunning")
    let timestamp=f("@timestamp")
    let Time=strftime("%a, %d %b %Y %T %z",timestamp)
    let {MachineName="dhost"} = f("@sophos")
    let {IPAddress="ip"} = f("@sophos.source_info")
    sort Time
    table Time, MachineName, IPAddress
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get the data for the timechart table over the time interval
 * specified in env.
 * 
 * @param {object} env - The environmental variables to be used in the FPL query
 *  
 * @returns {Table} table - Returns a table containing the time chart of failed update events
 */
function getTimeData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@sophos.type","Event::Endpoint::ServiceNotRunning")
    let timestamp=f("@timestamp")
    let Failures="Failures"
    timechart {span="1d"} count=count() by Failures
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
