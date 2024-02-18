/**
 * @file Metaflow_Traffic_Analysis_Outbound_SSH
 * @reportoverview A summary report of the ssh outbound traffic. The report has the total event count and total
 * bandwidth used over the time range grouped by the source IP, destination IP and country. The report also has a map
 * of the source IP addresses. 
 */

/**
 * Main method. The method gets the data from the field grouped by the source IP, destination IP and country. Then, gets
 * the top based on count and bandwidth used. The method also gets the geoip information of the top source IP addresses
 * to display on the map. The method also gets the unique source IP addresses and unique destination IP addresses.
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

    // initialize the table used
    let count_SourceIP_top10  = new Table()
    let count_DestIP_top20 = new Table()
    let count_Country_top20 = new Table()
    let bandwidth_sip_top10 = new Table()
    let bandwidth_dip_top20 = new Table()
    let bandwidth_country_top10 = new Table()
    let unique_dip = new Table()
    let unique_sip = new Table()

    let interval = "1d"
    // break the time range into intervals of 1 day and append the data to the tables
    for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
        let from = t
        let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
        let env = {type: "metaflow", from, to}
        count_SourceIP_top10.Append(GetDataBySip(env))
        count_DestIP_top20.Append(GetDataByDip(env))
        count_Country_top20.Append(GetDataByDCountry(env))
        bandwidth_sip_top10.Append(GetDataAgregateSip(env))
        bandwidth_dip_top20.Append(GetDataAgregateDip(env))
        bandwidth_country_top10.Append(GetDataAgregateDCountry(env))
        unique_dip.Append(UniqueDip(env))
        unique_sip.Append(UniqueSip(env))
    }

    // aggregates the data and get the top count/bandwidth used
    count_SourceIP_top10 = getTotalByField(count_SourceIP_top10, "sip", "count_SourceIP").Sort(10, "-count_SourceIP")
    count_DestIP_top20 = getTotalByField(count_DestIP_top20, "dip", "count_DestIP").Sort(20, "-count_DestIP")
    count_Country_top20 = getTotalByField(count_Country_top20, "country", "count_Country").Sort(20, "-count_Country")
    bandwidth_sip_top10 = getTotalByField(bandwidth_sip_top10, "sip", "totalbytes").Sort(10, "-totalbytes")
    bandwidth_dip_top20 = getTotalByField(bandwidth_dip_top20, "dip", "totalbytes").Sort(20, "-totalbytes")
    bandwidth_country_top10 = getTotalByField(bandwidth_country_top10, "country", "totalbytes").Sort(10, "-totalbytes")
    
    let map = bandwidth_dip_top20.GetColumnValues("dip").Table((_, obj) => {
        let {country = "", city = "", countryCode = "", isp = "", org= "" , latitude = "", longitude = ""} = geoip(obj)
        return {
            ip: obj,
            country,
            city,
            countryCode,
            isp,
            org,
            latitude,
            longitude
        }
    })

    return {
        count_SourceIP_top10,
        count_DestIP_top20,
        count_Country_top20,
        bandwidth_sip_top10,
        bandwidth_dip_top20,
        bandwidth_country_top10,
        map,
        unique_dip,
        unique_sip
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
 * This method gets the number of events for each source IP address over the time range.
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the total number of events for each source IP address
 */
function GetDataBySip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {sip} = f()
        aggregate count_SourceIP=count() by sip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of events for each destination IP address over the time range.
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the total number of events for each destination IP address
 */
function GetDataByDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {dip} = f()
        aggregate count_DestIP=count() by dip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of events for each country over the time range.
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the total number of events for each country
 */
function GetDataByDCountry(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {dip} = f()
        let {}=geoip(dip)
        aggregate count_Country=count() by country
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of bytes for each source IP address over the time range.
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the total number of bytes for each source IP address
 */
function GetDataAgregateSip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {sip} = f()
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by sip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of bytes for each destination IP address over the time range.
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the total number of bytes for each destination IP address
 */
function GetDataAgregateDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by dip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of bytes for each country over the time range.
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the total number of bytes for each country
 */
function GetDataAgregateDCountry(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {dip} = f()
        let {}=geoip(dip)
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by country
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of unique destination ip addresses over the time range
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the top 10 most common unique destination ip addresses
 */
function UniqueDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {dip,sip} = f()
        aggregate count_UniqueDip=unique(sip) by dip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This method gets the number of unique source ip addresses over the time range
 * 
 * @param {object} env - The environment variables used in the fpl query
 *  
 * @returns {Table} table - Returns a table with the top 10 most common unique source ip addresses
 */
function UniqueSip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
            and sContent("dp","22")
            and sContent("prot","6")
        let {dip,sip} = f()
        aggregate count_UniqueSip=unique(dip) by sip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This helper function groups the table by the specified field and gets the total number of sign ins.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by\
 * @param {string} totalField - The field to get the total number of sign ins
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