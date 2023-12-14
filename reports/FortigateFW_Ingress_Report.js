/**
 * @file FortigateFW_Ingress_Report
 * @reportoverview A summary report that shows the total number of events and the total size of fortigate devices by type and devname.
 * The report contains an overall table that shows the total number of unique devices and the total size of all fortigate devices.
 * The report also contains tables showing the total size and event count sorted by type and devname as well as the top 10 total size.
 */

/**
 * Main method. This method calls sizeByField to get the total number of events and the total size of fortigate devices by type and devname.
 * Then, this method aggregates the results into an overall table and the top 10 table by total size.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 * @param {string} hostname - The fortigate hostname to investigate
 * @param {string} policyid - The fortigate policy id to investigate
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-24h<m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the table used
  let typeStats = new Table()
  let devnameStats = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    typeStats.Append(sizeByField(from, to, "type"))
    devnameStats.Append(sizeByField(from, to, "devname"))
  }

  // gets the total number of events and the total number of devices over all time intervals
  typeStats = typeStats.Aggregate(({totalSize, eventCount, type}) => {
    return {
      groupBy: {type},
      columns: {
        sum: {totalSize},
        sum: {eventCount}
      }
    }
  })
  devnameStats = devnameStats.Aggregate(({totalSize, eventCount, devname}) => {
    return {
      groupBy: {devname},
      columns: {
        sum: {totalSize},
        sum: {eventCount}
      }
    }
  })

  // gets the total number of events and the total number of devices
  let totalFortigateStats = devnameStats.Aggregate(({totalSize, devname}) => {
    return {
      columns: {
        sum: {totalIngressSize: totalSize},
        dcount: {totalDevname: devname}
      }
    }
  })

  // get the top 10 total size by type and devname
  let topFortigateSizeByType = typeStats.Clone().Sort(10, "-totalSize")
  let topFortigateSizeByDevname = devnameStats.Clone().Sort(10, "-totalSize")

  return {
    typeStats,
    devnameStats,
    totalFortigateStats,
    topFortigateSizeByType,
    topFortigateSizeByDevname
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
 * This method groups the total size and event count by the field specified over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to get the total size of
 * 
 * @returns {Table} table - Returns a table containing the total size and event count of the field
 */
function sizeByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
    let {{.field}}=f("@fortigate.{{.field}}")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

