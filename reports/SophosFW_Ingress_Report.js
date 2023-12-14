/**
 * @file SophosFW_Ingress_Report
 * @reportoverview A summary report for the ingress data from SophosFW. The report includes
 * the total size and total count by source, action and sub as well as the top 10 size by those fields.
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
  let topSizeBySource = new Table()
  let topSizeByAction = new Table()
  let topSizeBySub = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      topSizeBySource.Append(sophos_source(from, to))
      topSizeByAction.Append(sophos_field(from, to, "action"))
      topSizeBySub.Append(sophos_field(from, to, "sub"))
  }

  // aggregate the tables to get the overall total size over all time intervals
  topSizeBySource = getTotalByField(topSizeBySource, "source")
  topSizeByAction = getTotalByField(topSizeByAction, "action")
  topSizeBySub = getTotalByField(topSizeBySub, "sub")

  // gets the top 10 size by source, action and sub
  let top10SizeBySource = topSizeBySource.Clone().Sort(10, "-totalSize")
  let top10SizeByAction = topSizeByAction.Clone().Sort(10, "-totalSize")
  let top10SizeBySub = topSizeBySub.Clone().Sort(10, "-totalSize")
  let totalSize = top10SizeBySub.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    topSizeBySource,
    topSizeByAction,
    topSizeBySub,
    top10SizeBySource,
    top10SizeByAction,
    top10SizeBySub,
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
 * This method is a helper method to get the total size and event count of sophos fw data
 * grouped by the specified field over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the total size and total count by source
 */
function sophos_source(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@eventType","Sophos")
    let source = f("@source")
    let size = f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by source
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get the total size and event count of sophos fw data
 * grouped by the specified field over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 *  
 * @returns {Table} table - Returns a table containing the total size and event count grouped by the specified field
 */
function sophos_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@eventType","Sophos")
    let {{.field}} = f("@sophos.{{.field}}")
    let size = f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by {{.field}}
  `
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