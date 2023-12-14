/**
 * @file Investigation_SonicWall_SrcIP_Activity
 * @reportoverview An investigation report that shows the top events and bandwidth usage of a specific SonicWall source IP. 
 * The events and bandwidth are grouped by the destination IP, service, and HTTP destination name.
 */

/**
 * Main method. This method calls EventsBy, BandwidthBy and HTTPEventsBy to get the top events and bandwidth usage
 * of a specific SoniceWall source IP grouped by a specific field. This method also calls bandwidthGeo to get the 
 * geo ip information of the destination IP associated with the source IP.
 * 
 * @param {string || int} from - The start of the time range. Default is the last 7 days
 * @param {string || int} to - The end of the time range. Default is the past minute
 * @param {string} sip - The sonicwall source IP to investigate
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({sip, from="-7d@d", to="@h"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initialize the tables to be used
  let dipEvents = new Table()
  let dipBandwidth = new Table()
  let serviceEvents = new Table()
  let serviceBandwidth = new Table()
  let dipHTTPEvents = new Table()
  let dipHTTPBandwidth = new Table()
  let dstNameHTTPBandwidth = new Table()
  let categoryHTTPBandwidth = new Table()

  let interval = "1d"
  // breaks the time down into 1 day intervals and gets the total number of sign ins by the specified field
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    let from = t

    // gets the table from the helper methods
    dipEvents.Append(EventsBy(sip, from, to, "dip"))
    dipBandwidth.Append(BandwidthBy(sip, from, to, "dip"))
    serviceEvents.Append(EventsBy(sip, from, to, "proto"))
    serviceBandwidth.Append(BandwidthBy(sip, from, to, "proto"))
    dipHTTPEvents.Append(HTTPEventsBy(sip, from, to, "dip"))
    dipHTTPBandwidth.Append(HTTPBandwidthBy(sip, from, to, "dip"))
    dstNameHTTPBandwidth.Append(HTTPBandwidthBy(sip, from, to, "dstname"))
    categoryHTTPBandwidth.Append(HTTPBandwidthBy(sip, from, to, "Category"))
  }
  
  // aggregate the tables and get the top values
  dipEvents = getTotalByField(dipEvents, "dip", "totalevents").Sort(20, "-totalevents")
  dipBandwidth = getTotalByField(dipBandwidth, "dip", "totalbytes").Sort(100, "-totalbytes")
  serviceEvents = getTotalByField(serviceEvents, "proto", "totalevents").Sort(20, "-totalevents")
  serviceBandwidth = getTotalByField(serviceBandwidth, "proto", "totalbytes").Sort(100, "-totalbytes")
  dipHTTPEvents = getTotalByField(dipHTTPEvents, "dip", "totalevents").Sort(20, "-totalevents")
  dipHTTPBandwidth = getTotalByField(dipHTTPBandwidth, "dip", "totalbytes").Sort(20, "-totalbytes")
  dstNameHTTPBandwidth = getTotalByField(dstNameHTTPBandwidth, "dstname", "totalbytes").Sort(20, "-totalbytes")
  categoryHTTPBandwidth = getTotalByField(categoryHTTPBandwidth, "Category", "totalbytes").Sort(20, "-totalbytes")
  let dCountryBandwidth = bandwidthGeo(dipBandwidth).Sort(20, "-totalbytes")
  let httpDCountryBandwidth = bandwidthGeo(dipHTTPBandwidth).Sort(20, "-totalbytes")

  return {
    dipEvents,
    dipBandwidth,
    serviceEvents,
    serviceBandwidth,
    dipHTTPEvents,
    dipHTTPBandwidth,
    dstNameHTTPBandwidth,
    categoryHTTPBandwidth,
    dCountryBandwidth,
    httpDCountryBandwidth
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
 * This method is a helper method that uses a template to get the top events of a specific sonicwall source IP
 * grouped by a specific field within the time range.
 * 
 * @param {string} sip - The sonicwall source IP to investigate
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} table - Returns a table containing the totalevents count by the specified field
 */
function EventsBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    aggregate totalevents = count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method that uses a template to get the top bandwidth of a specific sonicwall source IP
 * grouped by a specific field within the time range.
 * 
 * @param {string} sip - The sonicwall source IP to investigate
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} table - Returns a table containing the totalbytes by the specified field
 */
function BandwidthBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    let {sent,rcvd} = f("@sonicwall")
    let psent = parseInt(sent)
    let prcvd = parseInt(rcvd)
    let total = psent + prcvd
    aggregate totalbytes = sum(total) by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method that uses a template to get the top HTTP events of a specific sonicwall source IP
 * grouped by a specific field within the time range.
 * 
 * @param {string} sip - The sonicwall source IP to investigate
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} table - Returns a table containing the total HTTP events by the specified field
 */
function HTTPEventsBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    let {proto} = f("@sonicwall")
    where proto=="tcp/https"
    aggregate totalevents = count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method that uses a template to get the top HTTP bandwidth of a specific sonicwall source IP
 * grouped by a specific field within the time range.
 * 
 * @param {string} sip - The sonicwall source IP to investigate
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} table - Returns a table containing the total HTTP bandwidth by the specified field
 */
function HTTPBandwidthBy(sip, from, to, field) {
  let env = {sip, from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@event_type", "@sonicwall") and sContent("@sonicwall.sip", "{{.sip}}")
    let {{.field}} = f("@sonicwall.{{.field}}")
    let {proto, sent,rcvd} = f("@sonicwall")
    where proto=="tcp/https"
    let psent = parseInt(sent)
    let prcvd = parseInt(rcvd)
    let total = psent + prcvd
    aggregate totalbytes = sum(total) by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper method to get the geoip data of the destination IP and sort the data by total bytes.
 * 
 * @param {Table} dipTable - The table containing the top 20 bandwidth of the sonicwall source IP grouped by the destination IP
 * 
 * @returns {Table} - Returns the geoip data for each entry in the table sorted by the total bandwidth
 */
function bandwidthGeo(dipTable) {
  return dipTable.Aggregate(({dip, totalbytes}) => {
    let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(dip)
    return {
      groupBy: {country},
      columns: {
        first: {dip},
        sum: {totalbytes},
        first: {city},
        first: {countryCode},
        first: {isp},
        first: {org},
        first: {latitude},
        first: {longitude}
      }
    }
  })
}

/**
 * This helper function groups the table by the specified field and gets the total number of sign ins.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * @param {string} totalField - The field that is to be aggregated
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total number of sign ins
 */
function getTotalByField(table, field, totalField) {
  return table.Aggregate((obj)=>{
      let fieldValue = obj[field]
      let total = obj[totalField]
      return {
          groupBy: {[field]: fieldValue},
          columns: {
              sum: {[totalField]: total}
          }
      }
  })
}
