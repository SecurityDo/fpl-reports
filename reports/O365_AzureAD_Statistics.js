/**
 * @file O365_AzureAD_Statistics
 * @reportoverview A summary report for the top Azure Active Directory statistics by the operation, user id, application name,
 * client ip address, and country over a specific time range.
 */

/**
 * Main method. This method calls getOfficeAADStats to get the AAD statistics grouped by the different fields. 
 * 
 * @param {string || int} from - The start of the time range. Default is the past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-24h@m", to="@m"}) {    
    let rangeFrom = new Time(from)
    let rangeTo = new Time(to) 
    validateTimeRange(rangeFrom, rangeTo)
    setEnv("from", from)
    setEnv("to", to)

    // initializes the tables to be used
    let office_aad_by_ops = new Table()
    let office_aad_by_userid = new Table()
    let office_aad_by_application = new Table()
    let office_aad_by_ip = new Table()
    let office_aad_by_country = new Table()

    let interval = "1d"
    // break the time range into intervals of 1 day and append the data to the tables
    for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
        let from = t
        let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
        office_aad_by_ops.Append(getOfficeAADStats(from, to, "Operation"))
        office_aad_by_userid.Append(getOfficeAADStats(from, to, "UserId"))
        office_aad_by_application.Append(getOfficeAADStats(from, to, "ApplicationName"))
        office_aad_by_ip.Append(getOfficeAADStats(from, to, "ClientIP"))
        office_aad_by_country.Append(getOfficeAADStats(from, to, "country"))
    }
    
    // aggregate the tables to get the top 15 statistics for each field
    office_aad_by_ops = getTotalByField(office_aad_by_ops, "Operation").Sort(15, "-Operation")
    office_aad_by_userid = getTotalByField(office_aad_by_userid, "UserId").Sort(15, "-UserId")
    office_aad_by_application = getTotalByField(office_aad_by_application, "ApplicationName").Sort(15, "-ApplicationName")
    office_aad_by_ip = getTotalByField(office_aad_by_ip, "ClientIP").Sort(15, "-ClientIP")
    office_aad_by_country = getTotalByField(office_aad_by_country, "country").Sort(15, "-country")

    return {
        office_aad_by_ops,
        office_aad_by_userid,
        office_aad_by_application,
        office_aad_by_ip,
        office_aad_by_country
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
 * This method is a helper method to get the AAD event count for the specified field over the time range
 * given.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} group - The field to group the statistics by
 * 
 * @returns {Table} table - Returns a table containing the statistics for the specified field over the time range
 */
function getOfficeAADStats(from, to, group) {
    let env = {from, to, group}
    if (group == "country") {
        let fplTemplate = `
            search {from="{{.from}}", to="{{.to}}"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
            let {{.group}}  = f("@fields._ip.{{.group}}")
            aggregate events = count() by {{.group}}
            sort 15 events
        `
        let table = fluencyLavadbFpl(template(fplTemplate, env))
        return table
    } else {
        let fplTemplate = `
            search {from="{{.from}}", to="{{.to}}"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
            let {{.group}}  = f("@fields.{{.group}}")
            aggregate events = count() by {{.group}}
            sort 15 events
        `
        let table = fluencyLavadbFpl(template(fplTemplate, env))
        return table
    }
}

/**
 * This helper function groups the table by the specified field and gets the total number of sign ins.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total number of sign ins
 */
function getTotalByField(table, field) {
    return table.Aggregate((obj)=>{
        let fieldValue = obj[field]
        let events = obj["events"]
        return {
            groupBy: {[field]: fieldValue},
            columns: {
                sum: {events}
            }
        }
    })
}
