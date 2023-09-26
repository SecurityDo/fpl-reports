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

function events_by_field_selected(selected_users, events_table, fieldName) {
  return events_table.Clone().Join(selected_users, {UserId: "UserId"}).Aggregate((obj) => {
    let fieldValue = obj[fieldName]
    let events = obj["events"]
    return {
      groupBy: {[fieldName]: fieldValue},
      columns: {
        sum: {events}
      }
    }
  }).Sort(15, "-events")
}

function main({group, from="-48h@h", to="@h"}) {
  let selected_users = Fluency_ResourceLoad("Office365", "user", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let UserId = fields.userPrincipalName
    let {displayName, groups} = fields
    if (!groups.Some((_, g) => g == group)) {
      return null
    }
    return {UserId, displayName, groups}
  })
  let events_by_ops = office_aad_by_field("Operation", from, to)
  let events_by_application = office_aad_by_field("ApplicationName", from, to)
  let events_by_ip = office_aad_by_field("ClientIP", from, to)
  let events_by_country = office_aad_by_field("country", from, to)

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