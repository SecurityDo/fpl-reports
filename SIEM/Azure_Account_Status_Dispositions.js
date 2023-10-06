function accounts(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
      sContent("@eventType","Office365")
      and (sContent("@fields.Operation","Add user.") or sContent("@fields.Operation","Delete user.") or sContent("@fields.Operation","Enable account.") or sContent("@fields.Operation","Disable account."))
    let {ObjectId, UserId, Operation} = f("@fields")
    let timestamp=f("@timestamp")
    let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
    table ObjectId, UserId, Operation, iso2822, timestamp
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function dispositions_field(last_data, field) {
  return last_data.Clone().Filter(({Operation}) => Operation == field)
}

function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from="-30d<d", to="@d"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let accounts_data = accounts(env)
  let accounts_last_change = accounts_data.Aggregate(({ObjectId, timestamp}) => {
    return {
      groupBy: {ObjectId},
      columns: {
        max: {timestamp}
      }
    }
  })
  let last_data = accounts_data.Clone().Join(accounts_last_change, ({ObjectId, timestamp}) => "inner")
  let total_types = last_data.Aggregate(({Operation}) => {
    return {
      groupBy: {Operation},
      columns: {
        count: {Count: true}
      }
    }
  })
  let dispositions_disabled = dispositions_field(last_data, "Disable account.")
  let dispositions_deleted = dispositions_field(last_data, "Delete user.")
  let dispositions_enabled = dispositions_field(last_data, "Enable account.")
  let dispositions_created = dispositions_field(last_data, "Add user.")


  return {
    accounts_data,
    accounts_last_change,
    last_data,
    total_types,
    dispositions_disabled,
    dispositions_deleted,
    dispositions_enabled,
    dispositions_created
  }
}
