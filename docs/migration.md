# FPL v2 Coding Style

> Documentation site:
https://github.com/SecurityDo/fpl-reports/blob/main/docs/fplv2.adoc

Note: the following primarily applies to the process of converting legacy FPLv1 code to the current FPLv2 standard.

## Ex v1:
```
function main() {
    let fplTemplate = `
      %s
      let {id, isx5, isprime, odd, even, divisors} = f("@fields")
      aggregate v=values(id) by divisors
      let num_of_ints = listcount(v)
    `
    
    let search = `search {from="-16h"} sContent("@tags","fpl-example-data")`
    
    let demo_table = fluencyLavadbFpl(sprintf(fplTemplate, search))
    return {demo_table}
}
```

## Ex v2:
```
function main() {    
    let demo_table = example1()
    // let demo_table2 = example2()
    return {demo_table}
}

function example1() {
    let fplTemplate = `
      %s
      let {id, isx5, isprime, odd, even, divisors} = f("@fields")
      aggregate v=values(id) by divisors
      let num_of_ints = listcount(v)
    `
    let search = `search {from="-16h"} sContent("@tags","fpl-example-data")`
    let table = fluencyLavadbFpl(sprintf(fplTemplate, search))
    return table
}
```

## Notes:
* each script has a main() function
    * return statement defined the end tables
* legacy support: fluencyLavadbFpl() function supports legacy FPL script
    * search, also let / aggregate / sort, and related commands are supported.

## JSONTable

Create jsontable manually. Specify "rows". Each "row" may have n "columns". 
> Final result will have be a table of of len(rows) x n.

```
let rows = [
    {ID: "a", Col1: "x"},
    {ID: "b", Col2: "y"},
    {ID: "b", Col1: "y not"} // does not combine.
]

let t = jsonTable(rows)
printf("%v",t)
```

### Output

```
[{"Col1":"x","ID":"a"},{"Col2":"y","ID":"b"},{"Col1":"y not","ID":"b"}]
```

## Testing for table emptyness

Define a search with fluencyLavadbFpl:
```
function UserLoggedInAggregateUserId(from_date, to_date){
    let fplTemplate = `
        search {from="%s", to="%s"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId, ActorIpAddress, ApplicationName} = f("@fields") // CreationTime
        let {BrowserType, OS} = f("@fields.DevicePropertiesFields")
        let {RequestType} = f("@fields.ExtendedPropertiesFields")
        let {isp,country,city} = f("@fields._ip")
        aggregate ActorIpAddress=values(ActorIpAddress), Events=count(), BrowserType=values(BrowserType), OS=values(OS), RequestType=values(RequestType), isp=values(isp), country=values(country), countries=distinct(country), ApplicationName=values(ApplicationName) by UserId
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from_date, to_date))
    return table
}

let loginsLastweek = UserLoggedInAggregateUserId("-1w@w","@w")
```

Test table by counting the number of rows, via len()

```
if (len(loginsLastweek) == 0){
    printf("table's empty...")
} else {
    printf("table's ok...")
}

```

## Generate JSON table to replace empty results

Since the (expected) name(s) of the columns are known at the time of calling fluencyLavadbFpl(), we can manually define tables to show "No Data".
> This can prevent front-end interface issues.

```
function UserLoggedInAggregateUserId(from_date, to_date){
    let fplTemplate = `
        search {from="%s", to="%s"}
            sContent("@behaviors","O365_AzureAD_UserLoggedIn")
            and not sEntityinfo("@fields._ip.country","O365_UserLoggedIn_Country_Whitelist")
        let {UserId, ActorIpAddress, ApplicationName} = f("@fields") // CreationTime
        let {BrowserType, OS} = f("@fields.DevicePropertiesFields")
        let {RequestType} = f("@fields.ExtendedPropertiesFields")
        let {isp,country,city} = f("@fields._ip")
        aggregate ActorIpAddress=values(ActorIpAddress), Events=count(), BrowserType=values(BrowserType), OS=values(OS), RequestType=values(RequestType), isp=values(isp), country=values(country), countries=distinct(country), ApplicationName=values(ApplicationName) by UserId
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, from_date, to_date))
    if (len(table) == 0){
        let rows = [{UserId: "No data", ActorIpAddress: [""], Events: 0, BrowserType: [""], OS: [""], RequestType: [""], isp: [""], country: [""], countries: 0,  ApplicationName: [""]}]
        return jsonTable(rows)
    } else {
        return table
    }
    return table
}
```




