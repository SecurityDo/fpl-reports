function fetchAzureSignIn(env) {
    let fplTemplate = `
        search %s
        let {userDisplayName, userPrincipalName, appDisplayName, ipAddress, clientAppUsed, authenticationRequirement, createdDateTime} = f("@azureSignIn")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        let {city, countryOrRegion} = f("@azureSignIn.location")
        let {latitude, longitude} = f("@azureSignIn.location.geoCoordinates")
        sort 2000 createdDateTime
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchMostRecentByUser(env) {
    let fplTemplate = `
        search %s
        let {userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate createdDateTime=max(createdDateTime) by userPrincipalName
        sort 500 createdDateTime
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByAppDisplayName(env) {
    let fplTemplate = `
        search %s
        let {appDisplayName} = f("@azureSignIn")
        aggregate total=count() by appDisplayName
        sort 15 total
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByUserPrincipalName(env) {
    let fplTemplate = `
        search %s
        let {userDisplayName, userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate userDisplayName=max(userDisplayName), total=count() by userPrincipalName
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByUserDisplayName(env) {
    let fplTemplate = `
        search %s
        let {userDisplayName} = f("@azureSignIn")
        aggregate total=count() by userDisplayName
        sort 15 total
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByOperatingSystem(env) {
    let fplTemplate = `
        search %s
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by operatingSystem
        sort 15 total
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByBrowser(env) {
    let fplTemplate = `
        search %s
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by browser
        sort 15 total
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByCountryOrRegion(env) {
    let fplTemplate = `
        search %s
        let {countryOrRegion} = f("@azureSignIn.location")
        aggregate total=count() by countryOrRegion
        sort 15 total
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function fetchAzureSignInByCity(env) {
    let fplTemplate = `
        search %s
        let {city} = f("@azureSignIn.location")
        aggregate total=count() by city
        sort 15 total
    `
    return fluencyLavadbFpl(sprintf(fplTemplate, env))
}

function main() {
    let env = `{from="-24h@h", to="@h"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")`
    
    let recentSignIns = fetchAzureSignIn(env)
    let mostRecentByUser = fetchMostRecentByUser(env)
    let usedSignApp = fetchAzureSignInByAppDisplayName(env)
    let userFreq = fetchAzureSignInByUserDisplayName(env)
    let userEmailFreq = fetchAzureSignInByUserPrincipalName(env)
    let usedOS = fetchAzureSignInByOperatingSystem(env)
    let userBrowser = fetchAzureSignInByBrowser(env)
    let signInCountry = fetchAzureSignInByCountryOrRegion(env)
    let signInCity = fetchAzureSignInByCity(env)

    let uniqueUserEmails = userEmailFreq.GroupBy(({userPrincipalName})=>{
        return {columns:{ dcount: {users: userPrincipalName}}}
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
