/**
 * @file O365_AD_Summary_Report
 * @reportoverview An executive summary report that shows the behavior, key and level events over a time range and
 * the top behavior rules by hits.
 */

/**
 * Main method. This method breaks the time range into 1 day intervals and gets the behavior events for each day.
 * The overall table is then broken down into smaller tables based on the behavior, key and level.
 * 
 * @param {string || int} from - The start of the time range. Default is 1 day ago from the past hour
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

  // gets all Azure AD users that are enabled
  let enabled_users = Fluency_ResourceLoad("Office365", "user", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let {accountEnabled, displayName, mail} = fields
    if (!accountEnabled) {
      return null
    }
    return {accountEnabled, displayName, mail}
  })
  
  // gets all the Azure AD devices that are enabled
  let enabled_devices = Fluency_ResourceLoad("Office365", "device", "*", (obj, customer) => {
    let fields = obj["@office365Device"]
    let {accountEnabled, displayName, username} = fields
    if (!accountEnabled) {
      return null
    }
    return {accountEnabled, displayName, username}
  })

  // gets all the exchange assets
  let exchange_assets =  new Table()
  try {
    exchange_assets = Fluency_ResourceLoad("AD", "asset", "*", (obj, customer) => {
      let fields = obj["@ADAsset"]
      let {cn, lastLogon} = fields
      return {cn, lastLogon}
    })
  } catch (e) {
    // do nothing
  }

  // get the count of the enabled users and devices
  let enabled_users_count = enabled_users.Aggregate(() => {
    return {
      columns: {
        count: {Count: true}
      }
    }
  })
  let enabled_devices_count = enabled_devices.Aggregate(() => {
    return {
      columns: {
        count: {Count: true}
      }
    }
  })
  let exchange_assets_count = exchange_assets.Aggregate(() => {
    return {
      columns: {
        count: {Count: true}
      }
    }
  })

  // intitialize the table used
  let failed_logins_by_country = new Table()
  let failed_logins_by_user = new Table()
  let login_ip_table = new Table()
  let top_operations_table = new Table()
  let top_sharepoint_operations_table = new Table()
  let top_downloaded_operations_table = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    
    failed_logins_by_country.Append(failed_login(from, to, "Country"))
    failed_logins_by_user.Append(failed_login(from, to, "UserId"))
    login_ip_table.Append(login_ip(from, to))
    top_operations_table.Append(top_operations(from, to))
    top_sharepoint_operations_table.Append(top_sharepoint_operations(from, to))
    top_downloaded_operations_table.Append(top_sharepoint_by_field(from, to, "FileDownloaded"))
  }

  // get only unique ip addresses and get the geoip information to generate the login ip table map
  login_ip_table = login_ip_table.Aggregate(({ClientIP}) => {
    let {city, country, countryCode, latitude, longitude, isp, org} = geoip(ClientIP)
    if (isp == "Microsoft Corporation" || org == "Microsoft Corporation") {
      return null
    }
    return {
      groupBy: {ClientIP},
      columns: {
        first: {city},
        first: {country},
        first: {countryCode},
        first: {latitude},
        first: {longitude},
        first: {isp},
        first: {org}
      }
    }
  })

  // aggregate the count of failed logins by country and user over all time periods
  failed_logins_by_country = aggregate_by_field(failed_logins_by_country, "Country").Sort(10, "Count")
  failed_logins_by_user = aggregate_by_field(failed_logins_by_user, "UserId").Sort(10, "Count")

  // get the top 10 operations that are not login related
  top_operations_table = aggregate_by_field(top_operations_table, "Operation").Sort(10, "Count")

  // gets the top 10 sharepoint operations and fields
  top_sharepoint_operations_table = aggregate_by_field(top_sharepoint_operations_table, "Operation").Sort(10, "Count")
  top_downloaded_operations_table = aggregate_by_field(top_downloaded_operations_table, "SourceFileName").Sort(10, "Count")

  return {
    enabled_users_count,
    enabled_devices_count,
    exchange_assets_count,
    failed_logins_by_country,
    failed_logins_by_user,
    login_ip_table,
    top_operations_table,
    top_sharepoint_operations_table,
    top_downloaded_operations_table
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
  return true
}

/**
 * This method gets all the count of all failed login events grouped by the field passed in
 * over the time range.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} - Returns a table of all the failed login events
 */
function failed_login(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.AzureActiveDirectory") and sContent("@fields.Operation", "UserLoginFailed")
    let {Workload, UserId, Country="_ip.country"}=f("@fields")
    aggregate Count=count() by {{.field}}
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the ip address of all successful login events over the time period
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table of all the failed login events
 */
function login_ip(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.AzureActiveDirectory") and sContent("@fields.Operation", "UserLoggedIn")
    let {UserId, ClientIP}=f("@fields")
    aggregate Count=count() by ClientIP
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the count of all operations that are not login related over the time period
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table of all the non login related operations
 */
function top_operations(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.AzureActiveDirectory")
    let {Operation}=f("@fields")
    where not sContent(Operation, "UserLoggedIn") and not sContent(Operation, "UserLoginFailed")
    aggregate Count=count() by Operation
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the count of sharepoint and onedrive events over the time period
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} - Returns a table of all the non login related operations
 */
function top_sharepoint_operations(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.SharePoint")
    let {Operation, SourceFileName}=f("@fields")
    aggregate Count=count() by Operation
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method gets the count grouped by the field of sharepoint and onedrive events over the time period
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * @param {string} field - The field to group by
 * 
 * @returns {Table} - Returns a table of all the non login related operations
 */
function top_sharepoint_by_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@source", "Audit.SharePoint")
    let {Operation, Workload, SourceFileName}=f("@fields")
    let {org, isp}=f("@_ip")
    where not sContent(Operation, "{{.field}}") and sContent(Workload, "SharePoint") or sContent(Workload, "OneDrive") and not sContent(org, "Microsoft Corporation") and not sContent(isp, "Microsoft Corporation")
    aggregate Count=count() by SourceFileName
  `
  return fluencyLavadbFpl(template(fplTemplate, env))
}

/**
 * This method aggregates the data by the given field
 * 
 * @param {Table} table - The table to aggregate
 * @param {string} field - The field to aggregate by
 * 
 * @returns {Table} - Returns an aggregated table by the given field
 */
function aggregate_by_field(table, field) {
  return table.Aggregate((obj) => {
    let fieldValue = obj[field]
    let Count = obj.Count
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        sum: {Count}
      }
    }
  })
}