/**
 * @file Fortigate_SourceIP_Utilization_Report
 * @reportoverview Shows the overview of the source ip utilization in Fortigate from LavaDB from the time range and
 * device specified by the user. It also sorts and group the source IPs by bandwidth, count, and duration. The report
 * contains tables with the data obtained from the queries which can be used to create visualizations.
 */

/**
 * Main method. This method calls get data to obtain the table for the report based on the environment variables.
 * The table is further processed to get the top 20 source IPs by bandwidth, count, and duration. The tables obtained
 * and processed are then returned as an object.
 * 
 * @param {string || int} from - The start of the time range. Default is the past 12 hours
 * @param {string || int} to - The end of the time range. Default is the past minute
 * @param {string} devname - The name of the device
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-12h@m", to="@m", devname}) {
  validateTimeRange(new Time(from), new Time(to))

  // set the report environment variables
  setEnv("from", from)
  setEnv("to", to)

  let ip_utilization = getData(devname)
  let top20bandwidth = ip_utilization.Clone("srcip", "totalBandwidth").Sort(20, "totalBandwidth")
  let top20count = ip_utilization.Clone("srcip", "totalCount").Sort(20, "totalCount")
  let top20duration = ip_utilization.Clone("srcip", "totalDuration").Sort(20, "totalDuration")

  return {
    ip_utilization,
    top20bandwidth,
    top20count,
    top20duration
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
 * This method uses the environment variables to build a fpl query to get the source ip utilization data from LavaDB.
 * 
 * @param {string} devname - The name of the device
 *  
 * @returns {Table} table - Returns a table containing the source ip utilization data
 */
function getData(devname) {
  // get the time range from the environment variables
  let rangeFrom = new Time(getEnv("from"))
  let rangeTo = new Time(getEnv("to"))

  // initialize the table and the fpl template
  let table = new Table()
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@eventType", "FortigateNGFW") and sContent("@fortigate.devname", "{{.devname}}") and not sContent("@fortigate.logid", "0000000020") and not sContent("srcip", "0.0.0.0")
    let {srcip, srcname} = f("@fortigate")
    let {dur, totalB} = f("@metaflow.flow")
    aggregate names=values(srcname), totalCount=count(), totalBandwidth=sum(totalB), totalDuration=sum(dur) by srcip
  `
  
  let interval = "1d"
  // break the time range into intervals of 1 day and get the source ip utilization data for each interval
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let env = {from, to, devname}
    table.Append(fluencyLavadbFpl(template(fplTemplate, env)))
  }

  // aggregate the data from all the intervals for each source ip and sort by the total bandwidth
  table.Aggregate(({names, totalCount, totalBandwidth, totalDuration, srcip}) => {
    return {
      groupBy: {srcip},
      columns: {
        sum: {totalCount},
        sum: {totalBandwidth},
        sum: {totalDuration},
        values: {names}
      }
    }
  }).Sort(0, "totalBandwidth")

  return table
}
