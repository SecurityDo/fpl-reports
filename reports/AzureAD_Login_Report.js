/**
 * @file AzureAD_Login_Report
 * @reportoverview A summary report that shows the AzureAD login statistics over a period of time. The tables in the report are grouped 
 * by the following categories:
 *  - App Display Name
 *  - User Display Name
 *  - Operating System
 *  - Browser
 *  - Country
 *  - City
 *  - Unique Users
 */

/**
 * Main method. This gets the account status dispositions in Azure AD in the time range from LavaDB that matches the conditions.
 * The overall table is also broken down into individual tables for each disposition sorted by their most recent event.
 * 
 * @param {string || int} from - The start of the time range. Default is past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-1d@m", to="@m"}) {
    let rangeFrom = new Time(from)
    let rangeTo = new Time(to)
    validateTimeRange(rangeFrom, rangeTo)
    setEnv("from", from)
    setEnv("to", to)

    // initializes all the tables to be used
    let usedSignApp = new Table()
    let userFreq = new Table()
    let usedOS = new Table()
    let userBrowser = new Table()
    let signInCountry = new Table()
    let signInCity = new Table()
    let signInEvents = new Table()

    let interval = "1d"
    // breaks the time down into 1 day intervals and gets the total number of sign ins by the specified field
    for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
        let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
        let from = t

        usedSignApp.Append(fetchAzureSignInCountBy(from, to, "appDisplayName"))
        userFreq.Append(fetchAzureSignInCountBy(from, to, "userDisplayName"))
        usedOS.Append(fetchAzureSignInByBrowserOS(from, to, "operatingSystem"))
        userBrowser.Append(fetchAzureSignInByBrowserOS(from, to, "browser"))
        signInCountry.Append(fetchAzureSignInByLocation(from, to, "countryOrRegion"))
        signInCity.Append(fetchAzureSignInByLocation(from, to, "city"))
        signInEvents.Append(fetchAzureSignInByUserPrincipalName(from, to))
    }

    // aggregates each table to get the total over all the time ranges and sorts them by the total
    usedSignApp = getTotalByField(usedSignApp, "appDisplayName").Sort(25, "total")
    userFreq = getTotalByField(userFreq, "userDisplayName").Sort(10, "total")
    usedOS = getTotalByField(usedOS, "operatingSystem").Sort(25, "total")
    userBrowser = getTotalByField(userBrowser, "browser").Sort(25, "total")
    signInCountry = getTotalByField(signInCountry, "countryOrRegion").Sort(25, "total")
    signInCity = getTotalByField(signInCity, "city").Sort(15, "total")
    let userEmailFreq = getTotalByField(signInEvents, "userPrincipalName")

    // gets the total number of unique user emails
    let uniqueUserEmail = userEmailFreq.Aggregate(({userPrincipalName}) => {
        return {
            columns: {
                dcount: {userPrincipalName}
            }
        }
    })

    // gets the latest sign in event for each user
    let latestSignIns = signInEvents.Aggregate(({userPrincipalName, createdDateTime}) => {
        return {
            groupBy: {userPrincipalName},
            columns: {
                max: {createdDateTime},
            }
        }
    })
    latestSignIns.Join(signInEvents, ({userPrincipalName, createdDateTime}) => "inner")

    return {
        usedSignApp,
        userFreq,
        usedOS,
        userBrowser,
        signInCountry,
        signInCity,
        userEmailFreq,
        uniqueUserEmail,
        latestSignIns
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
 * This is a helper function used to get the total number of sign ins by user principal name. The table also contains
 * the user display name and the time of the sign in.
 * 
 * @param {Time} from 
 * @param {Time} to
 * 
 * @returns {Table} table - Returns a table containing the total number of sign ins by user principal name
 */
function fetchAzureSignInByUserPrincipalName(from, to) {
    let env = {from, to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName, userPrincipalName, appDisplayName, ipAddress, createdDateTime} = f("@azureSignIn")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        let {city, countryOrRegion} = f("@azureSignIn.location")
        let {latitude, longitude} = f("@azureSignIn.location.geoCoordinates")
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * Helper function that gets the total number of sign ins by the specified field.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} table - Returns a table containing the total number of sign ins by the specified field
 */
function fetchAzureSignInCountBy(from, to, field) {
    let env = {from, to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {{.field}} = f("@azureSignIn.{{.field}}")
        aggregate total=count() by {{.field}}
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * Helper function that gets the total number of sign ins by operating system or browser and groups them by the specified field.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to be grouped by (expecting operatingSystem or browser)
 * 
 * @returns {Table} table - Returns a table containing the total number of sign ins by operating system/browser
 */
function fetchAzureSignInByBrowserOS(from, to, field) {
    let env = {from, to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by {{.field}}
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * Helper function that gets the total number of sign ins by the specified location field.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The location field to be grouped by (expecting countryOrRegion or city)
 * 
 * @returns {Table} table - Returns a table containing the total number of sign ins by the specified location field
 */
function fetchAzureSignInByLocation(from, to, field) {
    let env = {from, to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {{.field}} = f("@azureSignIn.location.{{.field}}")
        aggregate total=count() by {{.field}}
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

/**
 * This helper function groups the table by the specified field and gets the total number of sign ins.
 * 
 * @param {Table} table - The table to be aggregated
 * @param {string} field - The field to be grouped by
 * 
 * @returns {Table} - Returns an aggregated table grouped by the specified field with the total number of sign ins
 */
function getTotalByField(table, field) {
    return table.Aggregate((obj)=>{
        let fieldValue = obj[field]
        let total = obj["total"]
        return {
            groupBy: {[field]: fieldValue},
            columns: {
                sum: {total}
            }
        }
    })
}

