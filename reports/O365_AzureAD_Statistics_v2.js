// Description:
// Various statistics from Office365 AzureActiveDirectory audit data
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
    let env = {from, to}
    let office_aad_by_ops = getOfficeAADStats(env.from, env.to, "Operation")
    let office_aad_by_userid = getOfficeAADStats(env.from, env.to, "UserId")
    let office_aad_by_application = getOfficeAADStats(env.from, env.to, "ApplicationName")
    let office_aad_by_ip = getOfficeAADStats(env.from, env.to, "ClientIP")
    let office_aad_by_country = getOfficeAADStats(env.from, env.to, "country")
    
    return {
        office_aad_by_ops,
        office_aad_by_userid,
        office_aad_by_application,
        office_aad_by_ip,
        office_aad_by_country
    }
}
