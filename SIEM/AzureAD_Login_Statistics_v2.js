function fetchAzureSignIn(from, to) {
    let env = {from, to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName, userPrincipalName, appDisplayName, ipAddress, clientAppUsed, authenticationRequirement, createdDateTime} = f("@azureSignIn")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        let {city, countryOrRegion} = f("@azureSignIn.location")
        let {latitude, longitude} = f("@azureSignIn.location.geoCoordinates")
        sort 2000 createdDateTime
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function fetchMostRecentByUser(from, to) {
    let env = {from, to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate createdDateTime=max(createdDateTime) by userPrincipalName
        sort 500 createdDateTime
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function fetchAzureSignInByUserPrincipalName(from, to) {
    let env = {from, to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName, userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate userDisplayName=max(userDisplayName), total=count() by userPrincipalName
    `
    return fluencyLavadbFpl(template(fplTemplate, env))
}

function fetchAzureSignInCountBy(from, to, field) {
    let env = {from, to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {{.field}} = f("@azureSignIn.{{.field}}")
        aggregate total=count() by {{.field}}
        sort 15 total
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByBrowserOS(from, to, field) {
    let env = {from, to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by {{.field}}
        sort 15 total
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByLocation(from, to, field) {
    let env = {from, to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {{.field}} = f("@azureSignIn.location.{{.field}}")
        aggregate total=count() by {{.field}}
        sort 15 total
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
    let env = {from, to}
    let recentSignIns = fetchAzureSignIn(env.from, env.to)
    let mostRecentByUser = fetchMostRecentByUser(env.from, env.to)
    let usedSignApp = fetchAzureSignInCountBy(env.from, env.to, "appDisplayName")
    let userFreq = fetchAzureSignInCountBy(env.from, env.to, "userDisplayName")
    let userEmailFreq = fetchAzureSignInByUserPrincipalName(env.from, env.to)
    let usedOS = fetchAzureSignInByBrowserOS(env.from, env.to, "operatingSystem")
    let userBrowser = fetchAzureSignInByBrowserOS(env.from, env.to, "browser")
    let signInCountry = fetchAzureSignInByLocation(env.from, env.to, "countryOrRegion")
    let signInCity = fetchAzureSignInByLocation(env.from, env.to, "city")

    let uniqueUserEmails = userEmailFreq.GroupBy(({userPrincipalName})=>{
        return {
            columns:{
                dcount: {users: userPrincipalName}
            }
        }
    })
    
    let latestSignIns = mostRecentByUser.Join(recentSignIns, {userPrincipalName: "userPrincipalName", createdDateTime: "createdDateTime"})
    
    return {
        recentSignIns, 
        mostRecentByUser, 
        usedSignApp, 
        userFreq, 
        userEmailFreq, 
        usedOS, 
        userBrowser, 
        signInCountry, 
        signInCity,
        uniqueUserEmails,
        latestSignIns
    }
}
