
function GetDataBySip(env) {
    let fplTemplate = `
        search %s sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        aggregate count_SourceIP=count() by sip
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function GetDataByDip(env) {
    let fplTemplate = `
        search %s sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        aggregate count_DestIP=count() by dip
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function GetDataByDCountry(env) {
    let fplTemplate = `
        search %s sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        let {}=geoip(dip)
        aggregate count_Country=count() by country
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function GetDataAgregateSip(env) {
    let fplTemplate = `
        search %s sEntityinfo("sip","HOME_NET")
            and not sEntityinfo("dip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by sip
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function GetDataAgregateDip(env) {
    let fplTemplate = `
        search %s sEntityinfo("sip","HOME_NET")
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
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function GetDataAgregateDCountry(env) {
    let fplTemplate = `
        search %s sEntityinfo("sip","HOME_NET")
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
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function main() {
    let env = `{type="metaflow", from="-24h@h",to="@h"}`
    
    let dataBySip = GetDataBySip(env)
    let dataByDip = GetDataByDip(env)
    let dataByDCountry = GetDataByDCountry(env)
    let dataAggregateSip = GetDataAgregateSip(env)
    let dataAggregateDip = GetDataAgregateDip(env)
    let dataAggregateDCountry = GetDataAgregateDCountry(env)

    return {
        dataBySip,
        dataByDip,
        dataByDCountry,
        dataAggregateSip,
        dataAggregateDip,
        dataAggregateDCountry
    }
}








