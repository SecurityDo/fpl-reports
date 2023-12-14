/**
 * @file CiscoUmbrella_OpenDNS_Ingress_Report
 * @reportoverview A summary report that shows statistics about the total data ingress from Cisco Umbrella OpenDNS
 * over a period of time. The report also shows the top 10 data ingress by the query type, respone code, policy identity type
 * and action. The tables can be used to make visualizations. 
 */

/**
 * Main method. This gets the Cisco OpenDNS ingress statistics over the time range from LavaDB grouped by the specified field.
 * The tables are sorted by the total size and a summary statistics table for the top 10 results is also returned.
 * 
 * @param {string || int} from - The start of the time range. Default is past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-24h<m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes all the tables to be used
  let totalSizeByType = new Table()
  let totalSizeByCode = new Table()
  let totalSizeByPIT = new Table()
  let totalSizeByAction = new Table()

  let interval = "1d"
  // breaks the time down into 1 day intervals and gets the total number of sign ins by the specified field
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      let from = t

      totalSizeByType.Append(opendnsByField(from, to, "queryType"))
      totalSizeByCode.Append(opendnsByField(from, to, "responseCode"))
      totalSizeByPIT.Append(opendnsByField(from, to, "policyIdentityType"))
      totalSizeByAction.Append(opendnsByField(from, to, "action"))
  }

  // aggregate all the tables to get the total size over all the time periods
  let totalSize = totalSizeByType.GroupBy(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })
  totalSizeByType = getTotal(totalSizeByType, "queryType")
  totalSizeByCode = getTotal(totalSizeByCode, "responseCode")
  totalSizeByPIT = getTotal(totalSizeByPIT, "policyIdentityType")
  totalSizeByAction = getTotal(totalSizeByAction, "action")

  // get the top 10 total size for each table
  let topSizeByType = totalSizeByType.Clone().Sort(10, "-totalSize")
  let topSizeByCode = totalSizeByCode.Clone().Sort(10, "-totalSize")
  let topSizeByPIT = totalSizeByPIT.Clone().Sort(10, "-totalSize")
  let topSizeByAction = totalSizeByAction.Clone().Sort(10, "-totalSize")

  return {
    totalSizeByType,
    totalSize,
    topSizeByType,
    totalSizeByCode,
    topSizeByCode,
    totalSizeByPIT,
    topSizeByPIT,
    totalSizeByAction,
    topSizeByAction
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
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group the events by
 * 
 * @returns {Table} table - Returns a table with the total size and total events for the open dns grouped the the field
 */
function opendnsByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
    let {queryType,responseCode,policyIdentityType,action}=f("@opendns")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This helper function groups the table by the specified field and gets the total size.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total size and count
 */
function getTotal(table, field) {
  return table.Aggregate((obj) => {
    let fieldValue = obj[field]
    let totalSize = obj.totalSize
    let eventCount = obj.eventCount
    return {
      groupBy: {[field]: fieldValue},
      columns: {
          sum: {totalSize: totalSize},
          sum: {eventCount: eventCount}
      }
    }
  })
}