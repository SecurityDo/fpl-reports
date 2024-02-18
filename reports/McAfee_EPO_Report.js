/**
 * @file McAfee_EPO_Report
 * @reportoverview A summary report of McAfee EPO events grouped by the machine. The table consists of EPO events,
 * MSME events and Update events. The report also has tables on the threats and TVD events over the time range.
 */

/**
 * Main method. The method calls mcafee_by to get the events from the field grouped by machine name, The tables
 * are then joined into an overall table by the machine name. This method also calls mcAfee_threats and mcafee_tvd
 * to get the threat and TVD events.
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

  // intitialize the table used and query template
  let mcafee_EPOEvent = new Table()
  let mcafee_EPOevent = new Table()
  let mcafee_MSMERoot = new Table()
  let mcafee_UpdateEvents = new Table()
  let threatsTable = new Table()
  let tvdTable = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)

    mcafee_EPOEvent.Append(mcafee_by(from, to, "EPOEvent"))
    mcafee_EPOevent.Append(mcafee_by(from, to, "EPOevent"))
    mcafee_MSMERoot.Append(mcafee_by(from, to, "MSMERoot"))
    mcafee_UpdateEvents.Append(mcafee_by(from, to, "UpdateEvents"))
    threatsTable.Append(mcafee_threats(from, to))
    tvdTable.Append(mcafee_tvd(from, to))
  }

  // join the tables together to get an overall table of all the events grouped by the machine
  let tableTotal = mergeTable(mcafee_EPOEvent, mcafee_EPOevent, mcafee_MSMERoot, mcafee_UpdateEvents)
  tableTotal = tableTotal.Aggregate(({MachineName, OSName, eventCount}) => {
    return {
      groupBy: {MachineName},
      columns: {
        max: {OSName},
        sum: {eventCount}
      }
    }
  })

  // get the top 10 machines with the most events
  let count_EventCount = tableTotal.Aggregate(({MachineName, eventCount}) => {
    return {
      groupBy: {MachineName},
      columns: {
        sum: {count_EventCount: eventCount}
      }
    }
  }).Sort(10, "-count_EventCount")

  // get the total number of machines
  let totalCount = tableTotal.Aggregate(({MachineName}) => {
    return {
      columns: {
        dcount: {total: MachineName}
      }
    }
  })

  // get the number of events grouped by the OS
  let count_OSName = tableTotal.Aggregate(({OSName}) => {
    return {
      groupBy: {OSName},
      columns: {
        count: {count_OSName: true}
      }
    }
  })

  return {
    tableTotal,
    count_EventCount,
    totalCount,
    count_OSName,
    threatsTable,
    tvdTable
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
 * @param {string} field - The field type to get the machine info from
 * 
 * @returns {Table} table - Returns a table with the usernames, os used and event count of the machine from the field specified
 */
function mcafee_by(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","XML") and sWildcard("@fields.xml.{{.field}}.MachineInfo.MachineName")
    let {UserName, MachineName, OSName,IPAddress} =f("@fields.xml.{{.field}}.MachineInfo")
    aggregate UserNames=values(UserName), OSName=max(OSName), eventCount=count() by MachineName
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets all the threats events from LavaDB
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing details of all the threat events
 */
function mcafee_threats(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","XML") and sWildcard("@fields.xml.EPOevent.MachineInfo.MachineName") and sWildcard("@fields.xml.EPOevent.SoftwareInfo._ProductName") and not sContent("@fields.xml.EPOevent.SoftwareInfo._ProductFamily","TVD")
    let {UserName,MachineName,OSName,IPAddress} =f("@fields.xml.EPOevent.MachineInfo")
    let {TargetFileName,TargetProcessName,ThreatActionTaken,ThreatCategory,ThreatEventID,ThreatName,ThreatSeverity} =f("@fields.xml.EPOevent.SoftwareInfo.Event.CommonFields")
    let ThreatEventIdDescription =f("@fields.ThreatEventIdDescription")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method gets all the TVD events from LavaDB
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing details of all the TVD events
 */
function mcafee_tvd(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@tags","XML") and sContent("@fields.xml.EPOevent.SoftwareInfo._ProductFamily","TVD")
    let {UserName,MachineName,OSName,IPAddress} =f("@fields.xml.EPOevent.MachineInfo")
    let {ThreatCategory,ThreatName,ThreatActionTaken} =f("@fields.xml.EPOevent.SoftwareInfo.Event.CommonFields")
    let Severity =f("@fields.Severity")
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}
