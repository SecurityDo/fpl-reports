function fetchAzureSignInByUserPrincipalName(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName, userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate userDisplayName=max(userDisplayName), total=count() by userPrincipalName
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function fetchAzureSignInByAppDisplayName(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {appDisplayName} = f("@azureSignIn")
        aggregate total=count() by appDisplayName
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function fetchAzureSignInByUserDisplayName(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName} = f("@azureSignIn")
        aggregate total=count() by userDisplayName
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function fetchAzureSignInByOperatingSystem(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by operatingSystem
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function fetchAzureSignInByBrowser(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by browser
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function fetchAzureSignInByCountryOrRegion(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {countryOrRegion} = f("@azureSignIn.location")
        aggregate total=count() by countryOrRegion
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function fetchAzureSignInByCity(from, to) {
    let fplTemplate = `
        search {from="%s", to="%s"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {city} = f("@azureSignIn.location")
        aggregate total=count() by city
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from, to))
    return table
}

function main() {
    let usedSignApp1=fetchAzureSignInByAppDisplayName("-30d<d","-25d>d")
    let usedSignApp2=fetchAzureSignInByAppDisplayName("-25d<d","-20d>d")
    let usedSignApp3=fetchAzureSignInByAppDisplayName("-20d<d","-15d>d")
    let usedSignApp4=fetchAzureSignInByAppDisplayName("-15d<d","-10d>d")
    let usedSignApp5=fetchAzureSignInByAppDisplayName("-10d<d","-5d>d")
    let usedSignApp6=fetchAzureSignInByAppDisplayName("-5d<d","-1d>d")
    
    let usedSignApp = mergeTable(usedSignApp1, usedSignApp2, usedSignApp3, usedSignApp4, usedSignApp5, usedSignApp6)
    usedSignApp.GroupBy(({appDisplayName, total})=>{
        return {keys: {appDisplayName}, columns: {sum: {total}}}
    })
    usedSignApp.Sort(25, "total")
        
    return {
        usedSignApp1,
        usedSignApp2,
        usedSignApp3,
        usedSignApp4,
        usedSignApp5,
        usedSignApp6,
        usedSignApp
    }
}








