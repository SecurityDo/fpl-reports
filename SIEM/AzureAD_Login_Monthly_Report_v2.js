function fetchAzureSignInByUserPrincipalName(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName, userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate userDisplayName=max(userDisplayName), total=count() by userPrincipalName
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByAppDisplayName(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {appDisplayName} = f("@azureSignIn")
        aggregate total=count() by appDisplayName
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByUserDisplayName(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName} = f("@azureSignIn")
        aggregate total=count() by userDisplayName
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByOperatingSystem(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by operatingSystem
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByBrowser(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {operatingSystem, browser} = f("@azureSignIn.deviceDetail")
        aggregate total=count() by browser
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByCountryOrRegion(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {countryOrRegion} = f("@azureSignIn.location")
        aggregate total=count() by countryOrRegion
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function fetchAzureSignInByCity(from, to) {
    let env = {from: from, to: to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {city} = f("@azureSignIn.location")
        aggregate total=count() by city
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function main() {
    let usedSignApp1=fetchAzureSignInByAppDisplayName("-30d<d","-25d>d")
    let usedSignApp2=fetchAzureSignInByAppDisplayName("-25d<d","-20d>d")
    let usedSignApp3=fetchAzureSignInByAppDisplayName("-20d<d","-15d>d")
    let usedSignApp4=fetchAzureSignInByAppDisplayName("-15d<d","-10d>d")
    let usedSignApp5=fetchAzureSignInByAppDisplayName("-10d<d","-5d>d")
    let usedSignApp6=fetchAzureSignInByAppDisplayName("-5d<d","-1d>d")
    let usedSignApp = mergeTable(usedSignApp1, usedSignApp2, usedSignApp3, usedSignApp4, usedSignApp5, usedSignApp6).Aggregate(({appDisplayName, total})=>{
        return {groupBy: {appDisplayName}, columns: {sum: {total}}}
    }).Sort(25, "total")
        
    let userFreq1 = fetchAzureSignInByUserDisplayName("-30d<d","-25d>d")
    let userFreq2 = fetchAzureSignInByUserDisplayName("-25d<d","-20d>d")
    let userFreq3 = fetchAzureSignInByUserDisplayName("-20d<d","-15d>d")
    let userFreq4 = fetchAzureSignInByUserDisplayName("-15d<d","-10d>d")
    let userFreq5 = fetchAzureSignInByUserDisplayName("-10d<d","-5d>d")
    let userFreq6 = fetchAzureSignInByUserDisplayName("-5d<d","-1d>d")
    let userFreq = mergeTable(userFreq1, userFreq2, userFreq3, userFreq4, userFreq5, userFreq6).Aggregate(({userDisplayName, total})=>{
        return {groupBy: {userDisplayName}, columns: {sum: {total}}}
    }).Sort(10, "total")

    let usedOS1 = fetchAzureSignInByOperatingSystem("-30d<d","-25d>d")
    let usedOS2 = fetchAzureSignInByOperatingSystem("-25d<d","-20d>d")
    let usedOS3 = fetchAzureSignInByOperatingSystem("-20d<d","-15d>d")
    let usedOS4 = fetchAzureSignInByOperatingSystem("-15d<d","-10d>d")
    let usedOS5 = fetchAzureSignInByOperatingSystem("-10d<d","-5d>d")
    let usedOS6 = fetchAzureSignInByOperatingSystem("-5d<d","-1d>d")
    let usedOS = mergeTable(usedOS1, usedOS2, usedOS3, usedOS4, usedOS5, usedOS6).Aggregate(({operatingSystem, total})=>{
        return {groupBy: {operatingSystem}, columns: {sum: {total}}}
    }).Sort(25, "total")

    let userBrowser1 = fetchAzureSignInByBrowser("-30d<d","-25d>d")
    let userBrowser2 = fetchAzureSignInByBrowser("-25d<d","-20d>d")
    let userBrowser3 = fetchAzureSignInByBrowser("-20d<d","-15d>d")
    let userBrowser4 = fetchAzureSignInByBrowser("-15d<d","-10d>d")
    let userBrowser5 = fetchAzureSignInByBrowser("-10d<d","-5d>d")
    let userBrowser6 = fetchAzureSignInByBrowser("-5d<d","-1d>d")
    let userBrowser = mergeTable(userBrowser1, userBrowser2, userBrowser3, userBrowser4, userBrowser5, userBrowser6).Aggregate(({browser, total})=>{
        return {groupBy: {browser}, columns: {sum: {total}}}
    }).Sort(25, "total")

    let signInCountry1 = fetchAzureSignInByCountryOrRegion("-30d<d","-25d>d")
    let signInCountry2 = fetchAzureSignInByCountryOrRegion("-25d<d","-20d>d")
    let signInCountry3 = fetchAzureSignInByCountryOrRegion("-20d<d","-15d>d")
    let signInCountry4 = fetchAzureSignInByCountryOrRegion("-15d<d","-10d>d")
    let signInCountry5 = fetchAzureSignInByCountryOrRegion("-10d<d","-5d>d")
    let signInCountry6 = fetchAzureSignInByCountryOrRegion("-5d<d","-1d>d")
    let signInCountry = mergeTable(signInCountry1, signInCountry2, signInCountry3, signInCountry4, signInCountry5, signInCountry6).Aggregate(({countryOrRegion, total})=>{
        return {groupBy: {countryOrRegion}, columns: {sum: {total}}}
    }).Sort(25, "total")

    let signInCity1 = fetchAzureSignInByCity("-30d<d","-25d>d")
    let signInCity2 = fetchAzureSignInByCity("-25d<d","-20d>d")
    let signInCity3 = fetchAzureSignInByCity("-20d<d","-15d>d")
    let signInCity4 = fetchAzureSignInByCity("-15d<d","-10d>d")
    let signInCity5 = fetchAzureSignInByCity("-10d<d","-5d>d")
    let signInCity6 = fetchAzureSignInByCity("-5d<d","-1d>d")
    let signInCity = mergeTable(signInCity1, signInCity2, signInCity3, signInCity4, signInCity5, signInCity6).Aggregate(({city, total})=>{
        return {groupBy: {city}, columns: {sum: {total}}}
    }).Sort(15, "total")

    let userEmailFreq1 = fetchAzureSignInByUserPrincipalName("-30d<d","-25d>d")
    let userEmailFreq2 = fetchAzureSignInByUserPrincipalName("-25d<d","-20d>d")
    let userEmailFreq3 = fetchAzureSignInByUserPrincipalName("-20d<d","-15d>d")
    let userEmailFreq4 = fetchAzureSignInByUserPrincipalName("-15d<d","-10d>d")
    let userEmailFreq5 = fetchAzureSignInByUserPrincipalName("-10d<d","-5d>d")
    let userEmailFreq6 = fetchAzureSignInByUserPrincipalName("-5d<d","-1d>d")
    let userEmailFreq = mergeTable(userEmailFreq1, userEmailFreq2, userEmailFreq3, userEmailFreq4, userEmailFreq5, userEmailFreq6).Aggregate(({userPrincipalName, total})=>{
        return {groupBy: {userPrincipalName}, columns: {sum: {total}}}
    })

    let uniqueUserEmail = userEmailFreq.Aggregate(({userPrincipalName}) => {
        return {columns: {dcount: {userPrincipalName}}}
    })

    return {
        usedSignApp,
        userFreq,
        usedOS,
        userBrowser,
        signInCountry,
        signInCity,
        userEmailFreq,
        uniqueUserEmail
    }
}
