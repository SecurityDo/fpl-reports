// Description:
// Various statistics from Office365 AzureActiveDirectory audit data

function main() {
    let office_aad_by_ops_fpl = `
        search {from="-24h@h", to="@h"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
        let {Operation} = f("@fields")
        aggregate events = count() by Operation
        sort 15 events
    `
    
    let office_aad_by_userid_fpl = `
        search {from="-24h@h", to="@h"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
        let {UserId} = f("@fields")
        aggregate events = count() by UserId
        sort 15 events
    `
    
    let office_aad_by_application_fpl = `
        search {from="-24h@h", to="@h"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
        let {ApplicationName} = f("@fields")
        aggregate events = count() by ApplicationName
        sort 15 events
    `
    
    let office_aad_by_ip_fpl = `
        search {from="-24h@h", to="@h"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
        let {ClientIP} = f("@fields")
        aggregate events = count() by ClientIP
        sort 15 events
    `

    let office_aad_by_country_fpl = `
        search {from="-24h@h", to="@h"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
        let {country} = f("@fields._ip")
        aggregate events = count() by country
        sort 15 events
    `

    let office_aad_by_ops = fluencyLavadbFpl(office_aad_by_ops_fpl)
    let office_aad_by_userid = fluencyLavadbFpl(office_aad_by_userid_fpl)
    let office_aad_by_application = fluencyLavadbFpl(office_aad_by_application_fpl)
    let office_aad_by_ip = fluencyLavadbFpl(office_aad_by_ip_fpl)
    let office_aad_by_country = fluencyLavadbFpl(office_aad_by_country_fpl)
    
    return {office_aad_by_ops, office_aad_by_userid, office_aad_by_application, office_aad_by_ip, office_aad_by_country}
}

