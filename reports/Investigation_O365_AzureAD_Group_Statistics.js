/**
 * @file Investigation_O365_AzureAD_Group_Statistics
 * @reportoverview This is an investigation report that shows the statistics of Azure AD events from the time range
 * for a given group. It shows all the users in the group and the events they generated grouped by operation,
 * application, IP, and country. The report contains tables with the data obtained from the queries which can be used
 * to create visualizations.
 */

/**
 * Main method. This method calls office_aad_by_field to get all Azure AD events in the time range specified grouped
 * by the given field. It then calls Fluency_ResourceLoad to get all Office365 users that are in the given group.
 * It then calls events_by_field_selected to get only the events that are from the users in the group. The tables
 * obtained are returned as an object.
 * 
 * @param {string} group - The group to be investigated
 * @param {string || int} from - The start of the time range. The default is 48 hours ago
 * @param {string || int} to - The end of the time range. THe default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metrics/alerts obtained from the queries
 */
function main({group, from="-48h@m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // gets all Azure AD events that matches the group to be investigated
  let selected_users = Fluency_ResourceLoad("Office365", "user", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let UserId = fields.userPrincipalName
    let {displayName, groups} = fields
    if (!groups?.Some((_, g) => g == group)) {
      return null
    }
    return {UserId, displayName, groups}
  })

  // get all the Azure AD events grouped by the field
  let events_by_ops = new Table()
  let events_by_application = new Table()
  let events_by_ip = new Table()
  let events_by_country = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    
    events_by_ops.Append(office_aad_by_field("Operation", from, to))
    events_by_application.Append(office_aad_by_field("ApplicationName", from, to))
    events_by_ip.Append(office_aad_by_field("ClientIP", from, to))
    events_by_country.Append(office_aad_by_field("country", from, to))
  }

  // get only the events that are from the users in the group
  let events_by_user = events_by_field_selected(selected_users, events_by_ops, "UserId")
  let events_by_ops_selected = events_by_field_selected(selected_users, events_by_ops, "Operation")
  let events_by_application_selected = events_by_field_selected(selected_users, events_by_application, "ApplicationName")
  let events_by_ip_selected = events_by_field_selected(selected_users, events_by_ip, "ClientIP")
  let events_by_country_selected = events_by_field_selected(selected_users, events_by_country, "country")

  return {
    selected_users,
    events_by_ops_selected,
    events_by_user,
    events_by_application_selected,
    events_by_ip_selected,
    events_by_country_selected
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
 * This method queries from LavaDB to get all the AzureAD events grouped by the field passed in
 * 
 * @param {string} field - The field to group the events by
 * @param {string} from - The start of the time range
 * @param {string} to - The end of the time range
 * 
 * @returns {object} - Returns a table with the total event count by user id and field or an error if the query fails
 */
function office_aad_by_field(field, from, to) {
  let env = {field, from, to}
  let fplTemplate = ""
  if (field == "country") {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
      let {UserId} = f("@fields")
      let {{.field}} = f("@fields._ip.{{.field}}")
      aggregate events = count() by UserId, {{.field}}
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
      let {UserId} = f("@fields")
      let {{.field}} = f("@fields.{{.field}}")
      aggregate events = count() by UserId, {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method does an inner join on the selected users and the events table to get only the events that are from the users in the group.
 * The table is then aggregated to get the total events grouped by the field passed in and sorted by the top 15 most frequent users.
 * 
 * @param {string} selected_users 
 * @param {string} events_table 
 * @param {string} fieldName 
 * 
 * @returns {Table} - Returns a table with the top 15 events of the selected user grouped by the field passed in
 */
function events_by_field_selected(selected_users, events_table, fieldName) {
  let table = events_table.Clone().Join(selected_users, {UserId: "UserId"})
  table.Aggregate((obj) => {
    let fieldValue = obj[fieldName]
    let events = obj["events"]
    return {
      groupBy: {[fieldName]: fieldValue},
      columns: {
        sum: {events}
      }
    }
  }).Sort(15, "-events")
  return table
}
