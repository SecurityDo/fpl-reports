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