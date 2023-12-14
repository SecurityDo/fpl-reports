/**
 * @file Microsoft365_Conditional_Access_Policies
 * @reportoverview A summary report of the Office365 Conditional Access Policies. This report shows the details on
 * the conditional access policies in the tenant.
/**
 * Main method. The method loads the Office365 Conditional Access Policies data from the vendor sorted by the state
 * and returns it.
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  let asset = Fluency_ResourceLoad("Office365", "ConditionalAccessPolicy", "*", (obj, customer) => {
    let fields = obj["@office365ConditionalAccessPolicy"]
    let {clientAppTypes} = fields.conditions
    let {users, userRiskLevels, signInRiskLevels, displayName} = fields.clientAppTypes
    let {builtInControls} = fields.grantControls
    let {state} = fields
    return {clientAppTypes, users, userRiskLevels, signInRiskLevels, displayName, builtInControls, state}
  })
  let table = asset.Sort(0, "+state")
  return {table}
}