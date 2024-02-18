/**
 * @file CiscoUmbrella_OpenDNSProxy_Ingress_Report
 * @reportoverview A summary report that shows statistics about the total data ingress from Cisco Umbrella OpenDNS Proxy
 * over a period of time. The report also shows the top 10 data ingress by the verdict, request method and policy identity type.
 * The tables can be used to make visualizations. 
 */

/**
 * Main method. This gets the Cisco OpenDNS proxy ingress statistics over the time range from LavaDB grouped by the specified field.
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
  let topSizeByVerdict = new Table()
  let topSizeByRequestMethod = new Table()
  let topSizeByPIT = new Table()

  let interval = "1d"
  // breaks the time down into 1 day intervals and gets the total number of sign ins by the specified field
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let from = t

    topSizeByVerdict.Append(openProxyBy(from, to, "verdict"))
    topSizeByRequestMethod.Append(openProxyBy(from, to, "requestMethod"))
    topSizeByPIT.Append(openProxyBy(from, to, "policyIdentityType"))
  }

  // aggregate all the tables to get the total size over all the time periods
  topSizeByVerdict = getTotal(topSizeByVerdict, "verdict")
  topSizeByRequestMethod = getTotal(topSizeByRequestMethod, "requestMethod")
  topSizeByPIT = getTotal(topSizeByPIT, "policyIdentityType")

  // gets the top 10 highest ingress size by the specified field
  let top10SizeByVerdict = topSizeByVerdict.Clone().Sort(10, "-totalSize")
  let top10SizeByRequestMethod = topSizeByRequestMethod.Clone().Sort(10, "-totalSize")
  let top10SizeByPIT = topSizeByPIT.Clone().Sort(10, "-totalSize")
  let totalSize = topSizeByRequestMethod.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    topSizeByVerdict,
    topSizeByRequestMethod,
    topSizeByPIT,
    top10SizeByVerdict,
    top10SizeByRequestMethod,
    top10SizeByPIT,
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
 * 
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} table - Returns a table with the total size and total events for the open dns grouped the the field
 */
function openProxyBy(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@opendnsProxy")
    let {{.field}}=f("@opendnsProxy.{{.field}}")
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