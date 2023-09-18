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

function main({from = "-30d<d", to = "@d", interval= "5d"}) {
    let rangeFrom = new Time(from)
    let rangeTo = new Time(to)
    let usedSignApp = new Table()
    let userFreq = new Table()
    let usedOS = new Table()
    let userBrowser = new Table()
    let signInCountry = new Table()
    let signInCity = new Table()
    let userEmailFreq = new Table()
    for let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval) {
        usedSignApp.Append(fetchAzureSignInByAppDisplayName(t, t.Add(interval)))
        userFreq.Append(fetchAzureSignInByUserDisplayName(t, t.Add(interval)))
        usedOS.Append(fetchAzureSignInByOperatingSystem(t, t.Add(interval)))
        userBrowser.Append(fetchAzureSignInByBrowser(t, t.Add(interval)))
        signInCountry.Append(fetchAzureSignInByCountryOrRegion(t, t.Add(interval)))
        signInCity.Append(fetchAzureSignInByCity(t, t.Add(interval)))
        userEmailFreq.Append(fetchAzureSignInByUserPrincipalName(t, t.Add(interval)))
    }
    usedSignApp = usedSignApp.Aggregate(({appDisplayName, total})=>{
        return {groupBy: {appDisplayName}, columns: {sum: {total}}}
    }).Sort(25, "total")
        
    userFreq = userFreq.Aggregate(({userDisplayName, total})=>{
        return {groupBy: {userDisplayName}, columns: {sum: {total}}}
    }).Sort(10, "total")

    usedOS = usedOS.Aggregate(({operatingSystem, total})=>{
        return {groupBy: {operatingSystem}, columns: {sum: {total}}}
    }).Sort(25, "total")

    userBrowser = userBrowser.Aggregate(({browser, total})=>{
        return {groupBy: {browser}, columns: {sum: {total}}}
    }).Sort(25, "total")

    signInCountry = signInCountry.Aggregate(({countryOrRegion, total})=>{
        return {groupBy: {countryOrRegion}, columns: {sum: {total}}}
    }).Sort(25, "total")

    signInCity = signInCity.Aggregate(({city, total})=>{
        return {groupBy: {city}, columns: {sum: {total}}}
    }).Sort(15, "total")

    userEmailFreq = userEmailFreq.Aggregate(({userPrincipalName, total})=>{
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
