/**
 * @file SentinelOne_CloudFunnel_Ingress_Report
 * @reportoverview A summary report for the ingress data from SentinelOne CloudFunnel. The report includes
 * the total size and total count by type, site name and group name as well as the top 10 size by those fields.
 */

/**
 * Main method. This method calls cloudfunnelBy to get the cloud funnel statistics grouped by the different fields over
 * different time intervals and then join the table to get the overall total size and total count. The tables 
 * are then processed to get the top 10 size.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from = "-24h@m", to = "@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables to be used
  let totalSizeByType = new Table()
  let totalSizeBySiteName = new Table()
  let totalSizeByGroupName = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      totalSizeByType.Append(cloudfunnelBy(from, to, "type"))
      totalSizeBySiteName.Append(cloudfunnelBy(from, to, "siteName"))
      totalSizeByGroupName.Append(cloudfunnelBy(from, to, "groupName"))
  }

  // aggregate the tables to get the overall total size over all time intervals
  totalSizeByType = getTotalByField(totalSizeByType, "type")
  totalSizeBySiteName = getTotalByField(totalSizeBySiteName, "siteName")
  totalSizeByGroupName = getTotalByField(totalSizeByGroupName, "groupName")

  // gets the top 10 size by type, site name and group name
  let top10SizeByType = totalSizeByType.Clone().Sort(10, "-totalSize")
  let top10SizeBySiteName = totalSizeBySiteName.Clone().Sort(10, "-totalSize")
  let top10SizeByGroupName = totalSizeByGroupName.Clone().Sort(10, "-totalSize")

  // gets the overall total size
  let totalSize = totalSizeByType.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    totalSizeByType,
    totalSizeBySiteName,
    totalSizeByGroupName,
    top10SizeByType,
    top10SizeBySiteName,
    top10SizeByGroupName,
    totalSize
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
 * This method is a helper method to get the total size and event count of sentinel one cloud funnel data
 * grouped by the specified field over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 *  
 * @returns {Table} table - Returns a table containing the total size and event count grouped by the specified field
 */
function cloudfunnelBy(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = ""
  if (field == "type") {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@source", "cloudfunnel")
      let {{.field}}=f("@cloudfunnel.{{.field}}")
      let size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by {{.field}}
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@source", "cloudfunnel")
      let {{.field}}=f("@cloudfunnel.agent.{{.field}}")
      let size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This helper function groups the table by the specified field and gets the total size and count
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total size and count
 */
function getTotalByField(table, field) {
  return table.Aggregate((obj)=>{
    let fieldValue = obj[field]
    let totalSize = obj["totalSize"]
    let eventCount = obj["eventCount"]
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        sum: {totalSize},
        sum: {eventCount}
      }
    }
  })
}
