// Description:
// UserLoggedIn from non-whitelisted countries in the previous two weeks

function UserLoggedInAggregateUserId(from_date, to_date){
    let fplTemplate = `
        search {from="%s", to="%s"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId, ActorIpAddress, ApplicationName} = f("@fields") // CreationTime
        let {BrowserType, OS} = f("@fields.DevicePropertiesFields")
        let {RequestType} = f("@fields.ExtendedPropertiesFields")
        let {isp,country,city} = f("@fields._ip")
        aggregate ActorIpAddress=values(ActorIpAddress), Events=count(), BrowserType=values(BrowserType), OS=values(OS), RequestType=values(RequestType), isp=values(isp), country=values(country), countries=distinct(country), ApplicationName=values(ApplicationName) by UserId
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from_date, to_date))
    if (len(table) == 0){
        let rows = [{UserId: "No data", ActorIpAddress: [""], Events: 0, BrowserType: [""], OS: [""], RequestType: [""], isp: [""], country: [""], countries: 0,  ApplicationName: [""]}]
        return jsonTable(rows)
    } else {
        return table
    }
    return table
}

function UserLoggedInAggregateActorIpAddress(from_date, to_date){
    let fplTemplate = `
        search {from="%s", to="%s"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId, ActorIpAddress} = f("@fields")
        aggregate Users=distinct(UserId) by ActorIpAddress
        sort 50 Users
        let {}=geoip(ActorIpAddress)
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from_date, to_date))
    if (len(table) == 0){
        let rows = [{ActorIpAddress: "No data", Users: 0, country: "No data", city: "No data", countryCode: "No data", isp: "No data", org: "No data", latitude: "No data", longitude: "No data"}]
        return jsonTable(rows)
    } else {
        return table
    }
    return table
}

function UserLoggedInAggregateActorCountry(from_date, to_date){
    let fplTemplate = `
        search {from="%s", to="%s"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId} = f("@fields")
        let {country} = f("@fields._ip")
        aggregate Users=distinct(UserId) by country
        sort 20 Users
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from_date, to_date))
    if (len(table) == 0){
        let rows = [{country: "No data", Users: 0}]
        return jsonTable(rows)
    } else {
        return table
    }
    return table
}

function UserLoggedInAggregateUserIdSimple(from_date, to_date){
    let fplTemplate = `
        search {from="%s", to="%s"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
        let {UserId, ActorIpAddress} = f("@fields") // CreationTime
        let {BrowserType, OS} = f("@fields.DevicePropertiesFields")
        let {isp,country,city} = f("@fields._ip")
        aggregate ActorIpAddress=values(ActorIpAddress), Events=count(), BrowserType=values(BrowserType), OS=values(OS), isp=values(isp), country=values(country), countries=distinct(country) by UserId
        where listcount(country)>1 // users with greater than 2 Countries
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from_date, to_date))
    if (len(table) == 0){
        let rows = [{UserId: "No data", ActorIpAddress: [""], Events: 0, BrowserType: [""], OS: [""], RequestType: [""], isp: [""], country: [""], countries: 0}]
        return jsonTable(rows)
    } else {
        return table
    }
    return table
}

function main() {
    let logins = UserLoggedInAggregateUserId("<w","w>") // this week
    let ips = UserLoggedInAggregateActorIpAddress("<w","w>") // this week
    let countries = UserLoggedInAggregateActorCountry("<w","w>") // this week
    let usersGt2 = UserLoggedInAggregateUserIdSimple("<w","w>")

    let loginsLastweek = UserLoggedInAggregateUserId("-1w@w","@w") // last week from="-1w@w",to="@w"
    let ipsLastweek = UserLoggedInAggregateActorIpAddress("-1w@w","@w") // last week
    let countriesLastweek = UserLoggedInAggregateActorCountry("-1w@w","@w") // last week
    let usersGt2LastWeek = UserLoggedInAggregateUserIdSimple("-1w@w","@w") // last week

    return {logins, ips, countries, usersGt2, loginsLastweek, ipsLastweek, countriesLastweek, usersGt2LastWeek}
}






