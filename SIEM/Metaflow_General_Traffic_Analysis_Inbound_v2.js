
function GetDataBySip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        aggregate count_SourceIP=count() by sip
        sort 20 count_SourceIP
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function GetDataByDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        aggregate count_DestIP=count() by dip
        sort 10 count_DestIP
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function GetDataBySCountry(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        let {} = geoip(sip)
        aggregate count_Country=count() by country
        sort 10 count_Country
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function GetDataAgregateSip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by sip
        sort 20 totalbytes
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function GetDataAgregateDip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip} = f()
        let {txB,rxB} = f()
        let psent = parseInt(txB)
        let prcvd = parseInt(rxB)
        let total = psent + prcvd
        aggregate totalbytes = sum(total) by dip
        sort 10 totalbytes
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function GetDataAgregateSCountry(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {sip} = f()
        let {}=geoip(sip)
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
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip,sip} = f()
        aggregate count_UniqueDip=unique(sip) by dip
        sort 10 count_UniqueDip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function UniqueSip(env) {
    let fplTemplate = `
        search {type = "{{.type}}", from="{{.from}}", to="{{.to}}"} sEntityinfo("dip","HOME_NET")
            and not sEntityinfo("sip","HOME_NET")
            and not sContent("txB","0") 
            and not sContent("rxB","0")
        let {dip,sip} = f()
        aggregate count_UniqueSip=unique(dip) by sip
        sort 20 count_UniqueSip
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
  }
  
  function main() {    
    setEnv("from", "-24h@h")
    setEnv("to", "@h")
    let env = {type: "metaflow", from: "-24h@h", to: "@h"}
    let count_SourceIP = GetDataBySip(env)
    let count_DestIP = GetDataByDip(env)
    let count_Country = GetDataBySCountry(env)
    let bandwidth_sip = GetDataAgregateSip(env)
    let bandwidth_dip = GetDataAgregateDip(env)
    let bandwidth_country = GetDataAgregateSCountry(env)
    let map = bandwidth_sip.GetColumnValues("sip").Table((_, obj) => {
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
        count_SourceIP,
        count_DestIP,
        count_Country,
        bandwidth_sip,
        bandwidth_dip,
        bandwidth_country,
        map,
        unique_dip,
        unique_sip
    }
  }
  