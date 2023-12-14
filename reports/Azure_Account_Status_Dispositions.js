/**
 * @file Azure_Account_Status_Dispositions
 * @reportoverview A summary report that shows the overview of account status dispositions in Azure AD in the time range.
 * The report contains an overall table of the account status dispositions that have the value:
 *  - Disable account
 *  - Delete user
 *  - Enable account
 *  - Add user
 * and tables of each disposition sorted by time. The tables can future be used to create visualizations.
 */

/**
 * Main method. This gets the account status dispositions in Azure AD in the time range from LavaDB that matches the conditions.
 * The overall table is also broken down into individual tables for each disposition sorted by their most recent event.
 * 
 * @param {string || int} from - The start of the time range. Default is past day
 * @param {string || int} to - The end of the time range. Default is the past minute
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main({from="-1d<m", to="@m"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to) 
  validateTimeRange(rangeFrom, rangeTo)
  setEnv("from", from)
  setEnv("to", to)

  // initializes the tables to be used
  let accounts_data = new Table()

  let interval = "1d"
  // break the time range into intervals of 1 day and append the data to the tables
  for (let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval)) {
    let from = t
    let to = t.Add(interval).After(rangeTo) ? rangeTo : t.Add(interval)
    accounts_data.Append(accounts(from, to))
  }

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
 * This method breaks the time range into 1 day intervals and gets the account status dispositions in Azure AD for each day from LavaDB.
 * 
 * @param {Time} from - The start of the time range
 * @param {Time} to - The end of the time range
 * 
 * @returns {Table} table - Returns a table containing the list of accounts
 */
function accounts(from, to) {
  let env = {from, to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@eventType","Office365")
      let {ObjectId, UserId, Operation} = f("@fields")
      let timestamp=f("@timestamp")
      let iso2822=strftime("%a, %d %b %Y %T %z", timestamp)
      where (sContent(Operation,"Add user.") or sContent(Operation,"Delete user.") or sContent(Operation,"Enable account.") or sContent(Operation,"Disable account."))
      table ObjectId, UserId, Operation, iso2822, timestamp
    `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

/**
 * This method is a helper function to filter from the last change of each account the ones with the specified field.
 * 
 * @param {Table} last_data - The table containing the last change of each account
 * @param {string} field - The field to be filtered
 * 
 * @returns {Table} - Returns a table containing the last change of each account with the specified field
 */
function dispositions_field(last_data, field) {
  return last_data.Clone().Filter(({Operation}) => Operation == field)
}
