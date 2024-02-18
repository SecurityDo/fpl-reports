/**
 * @file Peplink_Data_Usage
 * @reportoverview A summary report of the data usage in peplink over the specified time range. The report
 * contains of the total bytes sent and received, the number of source changes, and the bytes per hour.
 */

/**
 * Main method. This method gets the total bytes sent and received, the number of source changes, and the bytes per hour
 * used in peplink over the specified time range.
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

    // initialize the tables to be used
    let totalbytesResult = new Table()
    let src_changeResult = new Table()
    let totalbytes_per_hourResult = new Table()

    let interval = "1d"
    // break the time range into intervals of 1 day and append the data to the tables
    for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
        let from = t
        let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
        let time = {from, to}
        let env = template(`{from="{{.from}}", to="{{.to}}"} sContent("@source","surf-soho-6ccb")`, time)
        totalbytesResult.Append(totalbytes(env))
        src_changeResult.Append(src_change(env))
        totalbytes_per_hourResult.Append(totalbytes_per_hour(env))
    }

    // aggregate the tables to get the overall total over all time intervals
    totalbytesResult = totalbytesResult.Aggregate(({s}) => {
        return {
            columns: {
                sum: {s}
            }
        }
    })
    src_changeResult = src_changeResult.Aggregate(({src, src_count}) => {
        return {
            groupBy: {src},
            columns: {
                sum: {src_count}
            }
        }
    })

    return {
        totalbytesResult,
        src_changeResult,
        totalbytes_per_hourResult
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
 * This method is a helper method to get the peplink bytes sent and received over the time range
 * 
 * @param {object} env - The environment variables to be used in the query
 *  
 * @returns {Table} table - Returns a table containing the total bytes sent and received over the time range
 */
function totalbytes(env) {
    let fplTemplate = `
        search %s
        let sent=f("@fields.bytes_sent"),recvd=f("@fields.bytes_recvd"),session=f("@fields.session_state")
        let sent2=parseInt(sent)
        let recvd2=parseInt(recvd)
        where session=="END"
        aggregate s=sum(sent2+recvd2)
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

/**
 * This method is a helper method to get the peplink bytes sent and received by the hour
 * 
 * @param {object} env - The environment variables to be used in the query
 *  
 * @returns {Table} table - Returns a table containing the total bytes sent and received per hour
 */
function totalbytes_per_hour(env) {
    let fplTemplate = `
        search %s
        let sent=f("@fields.bytes_sent"),recvd=f("@fields.bytes_recvd"),session=f("@fields.session_state"),timestamp=f("@timestamp")
        let sent2=parseInt(sent)
        let recvd2=parseInt(recvd)
        where session=="END"
        let Hour=strftime("%D:%H:%M",timebucket("1h",timestamp))  
        aggregate s=sum(sent2+recvd2) by Hour
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

/**
 * This method is a helper method to get the peplink source changes over the time range
 * 
 * @param {object} env - The environment variables to be used in the query
 *  
 * @returns {Table} table - Returns a table containing the number of source changes over the time range
 */
function src_change(env) {
    let fplTemplate = `
        search %s and sStartswith("@fields.src","192")
        let src=f("@fields.src"),session=f("@fields.session_state"),timestamp=f("@timestamp")
        where session=="END"
        aggregate src_count=count() by src
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}
