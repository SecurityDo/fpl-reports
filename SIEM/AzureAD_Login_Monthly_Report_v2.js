function fetchAzureSignInByUserPrincipalName(from, to) {
    let env = {from, to}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@azureSignIn") and sContent("@azureSignIn.status.errorCode", "0")
        let {userDisplayName, userPrincipalName, createdDateTime} = f("@azureSignIn")
        aggregate userDisplayName=max(userDisplayName), total=count() by userPrincipalName
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

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

function validateTimeRange(from, to) {
    if (from.After(to)) {
      throw new Error("rangeFrom must be less than rangeTo", "RangeError")
    }
    return true
  }  

function main() {
    let interval = "5d"
    let rangeFrom = new Time("-30d<d")
    let rangeTo = new Time("@d")
    validateTimeRange(rangeFrom, rangeTo)
    setEnv("from", "-30d<d")
    setEnv("to", "@d")
    let usedSignApp = new Table()
    let userFreq = new Table()
    let usedOS = new Table()
    let userBrowser = new Table()
    let signInCountry = new Table()
    let signInCity = new Table()
    let userEmailFreq = new Table()
    for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
        let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
        let from = rangeFrom
        usedSignApp.Append(fetchAzureSignInCountBy(from, to, "appDisplayName"))
        userFreq.Append(fetchAzureSignInCountBy(from, to, "userDisplayName"))
        usedOS.Append(fetchAzureSignInByBrowserOS(from, to, "operatingSystem"))
        userBrowser.Append(fetchAzureSignInByBrowserOS(from, to, "browser"))
        signInCountry.Append(fetchAzureSignInByLocation(from, to, "countryOrRegion"))
        signInCity.Append(fetchAzureSignInByLocation(from, to, "city"))
        userEmailFreq.Append(fetchAzureSignInByUserPrincipalName(from, to))
    }
    usedSignApp = usedSignApp.Aggregate(({appDisplayName, total})=>{
        return {
            groupBy: {appDisplayName},
            columns: {
                sum: {total}
            }
        }
    }).Sort(25, "total")
        
    userFreq = userFreq.Aggregate(({userDisplayName, total})=>{
        return {
            groupBy: {userDisplayName},
            columns: {
                sum: {total}
            }
        }
    }).Sort(10, "total")

    usedOS = usedOS.Aggregate(({operatingSystem, total})=>{
        return {
            groupBy: {operatingSystem}, 
            columns: {
                sum: {total}
            }
        }
    }).Sort(25, "total")

    userBrowser = userBrowser.Aggregate(({browser, total})=>{
        return {
            groupBy: {browser},
            columns: {
                sum: {total}
            }
        }
    }).Sort(25, "total")

    signInCountry = signInCountry.Aggregate(({countryOrRegion, total})=>{
        return {
            groupBy: {countryOrRegion},
            columns: {
                sum: {total}
            }
        }
    }).Sort(25, "total")

    signInCity = signInCity.Aggregate(({city, total})=>{
        return {
            groupBy: {city},
            columns: {
                sum: {total}
            }
        }
    }).Sort(15, "total")

    userEmailFreq = userEmailFreq.Aggregate(({userPrincipalName, total})=>{
        return {
            groupBy: {userPrincipalName},
            columns: {
                sum: {total}
            }
        }
    })

    let uniqueUserEmail = userEmailFreq.Aggregate(({userPrincipalName}) => {
        return {
            columns: {
                dcount: {userPrincipalName}
            }
        }
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
