
function GetDataBySip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        aggregate count_SourceIP=count() by sip
        sort 10 count_SourceIP
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function GetDataByDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        aggregate count_DestIP=count() by dip
        sort 20 count_DestIP
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function GetDataByDCountry(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        let {}=geoip(dip)
        aggregate count_Country=count() by country
        sort 20 count_Country
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function GetDataAgregateSip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by sip
        sort 10 totalbytes
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

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
        sort 20 totalbytes
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function GetDataAgregateDCountry(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        let {}=geoip(dip)
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by country
        sort 20 totalbytes
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function UniqueDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip,sip} = f()
        aggregate count_UniqueDip=unique(sip) by dip
        sort 20 count_UniqueDip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function UniqueSip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip,sip} = f()
        aggregate count_UniqueSip=unique(dip) by sip
        sort 20 count_UniqueSip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function validateTimeRange(from, to) {
    if (from.After(to)) {
      throw new Error("rangeFrom must be less than rangeTo", "RangeError")
    }
    return true
}

function main({from="-24h@h", to="@h"}) {    
    validateTimeRange(new Time(from), new Time(to))
    setEnv("from", from)
    setEnv("to", to)   
    let env = {type: "metaflow", from, to}
    let count_SourceIP_top10 = GetDataBySip(env)
    let count_DestIP_top20 = GetDataByDip(env)
    let count_Country_top20 = GetDataByDCountry(env)
    let bandwidth_sip_top10 = GetDataAgregateSip(env)
    let bandwidth_dip_top20 = GetDataAgregateDip(env)
    let bandwidth_country_top10 = GetDataAgregateDCountry(env).Sort(10, "-totalbytes")
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
    let unique_dip = UniqueDip(env)
    let unique_sip = UniqueSip(env)

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
