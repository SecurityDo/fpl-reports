/**
 * @file SonicWall_Ingress_Report
 * @reportoverview A summary report for the ingressed data in SonicWall. The report contains the total size
 * and total count sorted by the serial number, firewall action, and category as well as the top 10 size by
 * those fields.
 */

/**
 * Main method. This method calls sonicwall_by to get the sonicwall statistics grouped by the different fields over
 * different time intervals and then join the table to get the overall total size and total count. The tables 
 * are then processed to get the top 10 size.
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from= "-24h<m", to= "@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables to be used
  let topSizeBysn = new Table()
  let topSizeByfw_action = new Table()
  let topSizeByc = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
      let from = t
      let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
      topSizeBysn.Append(sonicwall_by(from, to, "sn"))
      topSizeByfw_action.Append(sonicwall_by(from, to, "fw_action"))
      topSizeByc.Append(sonicwall_c(from, to))
  }

  // aggregate the tables to get the overall total size over all time intervals
  topSizeBysn = getTotalByField(topSizeBysn, "sn")
  topSizeByfw_action = getTotalByField(topSizeByfw_action, "fw_action")
  topSizeByc = getTotalByField(topSizeByc, "c")

  // gets the top 10 size by type, site name and group name
  let top10SizeBysn = topSizeBysn.Clone().Sort(10, "-totalSize")
  let top10SizeByfw_action = topSizeByfw_action.Clone().Sort(10, "-totalSize")
  let top10SizeByc = topSizeByc.Clone().Sort(10, "-totalSize")

  // gets the overall total size
  let totalSize = topSizeBysn.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    topSizeBysn,
    topSizeByfw_action,
    topSizeByc,
    top10SizeBysn,
    top10SizeByfw_action,
    top10SizeByc,
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
 * This method is a helper method to get the total size and event count of sonic wall data
 * grouped by the specified field over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 *  
 * @returns {Table} table - Returns a table containing the total size and event count grouped by the specified field
 */
function sonicwall_by(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@sonicwall")
    let {{.field}}=f("@sonicwall.{{.field}}")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get the total size and event count of sonic wall data grouped by 
 * category over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 *  
 * @returns {Table} table - Returns a table containing the total size and event count grouped by the category
 */
function sonicwall_c(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@sonicwall")
    let cid=f("@sonicwall.c")
    let size=f("__size__")
    let {Description} = entitylookup(cid, "Sonicwall_CategoryID")
    let c = condition(len(Description)>0, cid .. " - " .. Description, cid) 
    aggregate totalSize=sum(size), eventCount=count() by c
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
