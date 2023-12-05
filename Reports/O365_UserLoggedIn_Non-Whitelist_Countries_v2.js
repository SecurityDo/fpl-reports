// Description:
// UserLoggedIn from non-whitelisted countries in the previous two weeks
function UserLoggedInAggregateUserId(env) {
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId, ActorIpAddress, ApplicationName} = f("@fields") // CreationTime
        let {BrowserType, OS} = f("@fields.DevicePropertiesFields")
        let {RequestType} = f("@fields.ExtendedPropertiesFields")
        let {isp,country,city} = f("@fields._ip")
        aggregate ActorIpAddress=values(ActorIpAddress), Events=count(), BrowserType=values(BrowserType), OS=values(OS), RequestType=values(RequestType), isp=values(isp), country=values(country), countries=distinct(country), ApplicationName=values(ApplicationName) by UserId
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function UserLoggedInAggregateActorIpAddress(env) {
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId, ActorIpAddress} = f("@fields")
        aggregate Users=distinct(UserId) by ActorIpAddress
        sort 50 Users
        let {}=geoip(ActorIpAddress)
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function UserLoggedInAggregateActorCountry(env) {
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId} = f("@fields")
        let {country} = f("@fields._ip")
        aggregate Users=distinct(UserId) by country
        sort 20 Users
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function UserLoggedInAggregateUserIdSimple(env) {
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
        let {UserId, ActorIpAddress} = f("@fields") // CreationTime
        let {BrowserType, OS} = f("@fields.DevicePropertiesFields")
        let {isp,country,city} = f("@fields._ip")
        aggregate ActorIpAddress=values(ActorIpAddress), Events=count(), BrowserType=values(BrowserType), OS=values(OS), isp=values(isp), country=values(country), countries=distinct(country) by UserId
        where listcount(country)>1 // users with greater than 2 Countries
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function main() {
    // this week data
    let env = {from: "@w", to: "@d"}
    let logins = UserLoggedInAggregateUserId(env)
    let ips = UserLoggedInAggregateActorIpAddress(env)
    let countries = UserLoggedInAggregateActorCountry(env)
    let usersGt2 = UserLoggedInAggregateUserIdSimple(env)
    // last week data
    env = {from: "-w@w", to: "@w"}
    let loginsLastweek = UserLoggedInAggregateUserId(env)
    let ipsLastweek = UserLoggedInAggregateActorIpAddress(env)
    let countriesLastweek = UserLoggedInAggregateActorCountry(env)
    let usersGt2LastWeek = UserLoggedInAggregateUserIdSimple(env)
    setEnv("from", "-w@w")
    setEnv("to", "@d")

    return {
        logins,
        ips,
        countries,
        usersGt2,
        loginsLastweek,
        ipsLastweek,
        countriesLastweek,
        usersGt2LastWeek
    }
}
