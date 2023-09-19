function main({username}) {
  let fplTemplate = `
    search {from="-14d<d"} sContent("@sender","office365") and sContent("@fields.UserId", "{{.username}}") and not sContent("@fields.Operation", "UserLoginFailed") and not sContent("@fields.Operation", "UserLoggedIn")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    let {Workload, Operation,  ApplicationName, City="_ip.city", Country="_ip.country"}=f("@fields")
    let Details=coalesce(f("@fields.SourceFileName"), f("@fields.TargetUserOrGroupName"))
    sort 1000 timestamp
  `
  let table = fluencyLavadbFpl(template(fplTemplate, {username}))
  table = table.RemoveColumn("timestamp")
  return {table}
}