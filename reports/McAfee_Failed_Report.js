/**
 * @file McAfee_Failed_Report
 * @reportoverview A summary report of failed McAfee events grouped by machineName and IPAddress. The report also has
 * a time chart of the failed events over the time range.
 */

/**
 * Main method. The method calls getData to get all the failed events over the time range. The overall table is then
 * processed into top 10 count tables grouped by machine name and IP address. The method also call getTimeData to get
 * a time chart of the failed events over the time range.
 * 
 * @param {string || int} from - The start of the time range. Default is the last 7 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-7d@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the tables to be used
  let totalFailedData = new Table()
  let timeChart = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {from, to}
    totalFailedData.Append(getData(env))
    timeChart.Append(getTimeData(env))
  }

  // aggregate the data based on the specified fields
  let failureCount = totalFailedData.Aggregate(() => {
    return {
      columns: {
        count: {TotalCount: true}
      }
    }
  })
  let topFailureCountByMachineName = totalFailedData.Aggregate(({MachineName}) => {
    return {
      groupBy: {MachineName},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let topFailureCountByIPAddress = totalFailedData.Aggregate(({IPAddress}) => {
    return {
      groupBy: {IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let failureCountByMachineNameAndIPAddress = totalFailedData.Aggregate(({MachineName, IPAddress}) => {
    return {
      groupBy: {MachineName, IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  })

  return {
    totalFailedData,
    failureCount,
    topFailureCountByMachineName,
    topFailureCountByIPAddress,
    failureCountByMachineNameAndIPAddress,
    timeChart
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
 * This method gets all the failed McAfee events from LavaDB over the time range.
 * 
 * @param {object} env - The environment variables to be used in the query
 * 
 * @returns {Table} table - Returns a table containing all the failed events sorted by time
 */
function getData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@fields.xml.EPOEvent.SoftwareInfo.Event.EventID","1119")
    let timestamp=f("@timestamp")
    let Time=strftime("%a, %d %b %Y %T %z",timestamp)
    let {MachineName,IPAddress} = f("@fields.xml.EPOEvent.MachineInfo")
    sort Time
    table Time, MachineName, IPAddress
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method queries LavaDB for the time chart data of all the failed events over the time range.
 * 
 * @param {object} env - The environment variables to be used in the query
 * 
 * @returns {Table} table - Returns a timechart table for all the failed events over the time range 
 */
function getTimeData(env) {
  // initialize the table and query to be used
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@fields.xml.EPOEvent.SoftwareInfo.Event.EventID","1119")
    let timestamp=f("@timestamp")
    let Failures="Failures"
    timechart {span="1d"} count=count() by Failures
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

