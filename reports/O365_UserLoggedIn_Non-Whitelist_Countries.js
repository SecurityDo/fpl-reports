/**
 * @file O365_UserLoggedIn_Non-Whitelist_Countries
 * @reportoverview A summary report that compares the different statistics for office 365 user logins on to
 * non-whitelist countries from this week and the previous week. The fields used for comparison are the diffenent
 * ips, countries and users. The report also contains a table of users that logged into multiple countries.
 */

/**
 * Main method. This method calls UserLoggedInAggregateUserId, UserLoggedInAggregateActorIpAddress,
 * UserLoggedInAggregateActorCountry and UserLoggedInAggregateUserIdSimple to get the statistics for this week
 * and the previous week.
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
    // set the environment variables
    setEnv("from", "-w@w")
    setEnv("to", "@d")

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

/**
 * This method is a helper method to get the event of users logging into non-whitelist countries.
 * 
 * @param {object} env - The environment variables used for the query 
 * 
 * @returns {Table} - Returns a table containing the statistics for the different users
 */
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

/**
 * This method is a helper method to get the statistics for users that logged into non-whitelist countries
 * and the ip addresses they logged in from.
 * 
 * @param {object} env - The environment variables used for the query 
 * 
 * @returns {Table} - Returns a table containing the statistics for the different ip addresses
 */
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

/**
 * This method is a helper method to get the statistics for users that logged into non-whitelist countries
 * and the country that they logged into.
 * 
 * @param {object} env - The environment variables used for the query 
 * 
 * @returns {Table} - Returns a table containing the statistics for the different countries
 */
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

/**
 * This method is a helper method to get the statistics for users that logged into multiple countries.
 * 
 * @param {object} env - The environment variables used for the query 
 * 
 * @returns {Table} - Returns a table containing the statistics for users that logged into multiple countries
 */
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
