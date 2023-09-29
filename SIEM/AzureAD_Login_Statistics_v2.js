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

function main() {    
    setEnv("from", "-24h@h")
    setEnv("to", "@h")
    let recentSignIns = fetchAzureSignIn("-24h@h", "@h")
    let mostRecentByUser = fetchMostRecentByUser("-24h@h", "@h")
    let usedSignApp = fetchAzureSignInCountBy("-24h@h", "@h", "appDisplayName")
    let userFreq = fetchAzureSignInCountBy("-24h@h", "@h", "userDisplayName")
    let userEmailFreq = fetchAzureSignInByUserPrincipalName("-24h@h", "@h")
    let usedOS = fetchAzureSignInByBrowserOS("-24h@h", "@h", "operatingSystem")
    let userBrowser = fetchAzureSignInByBrowserOS("-24h@h", "@h", "browser")
    let signInCountry = fetchAzureSignInByLocation("-24h@h", "@h", "countryOrRegion")
    let signInCity = fetchAzureSignInByLocation("-24h@h", "@h", "city")

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
