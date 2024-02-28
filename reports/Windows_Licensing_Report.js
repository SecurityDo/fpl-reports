/**
 * @file Windows_Licensing_Report
 * @reportoverview A master report that shows the microsoft license associated with the office365 users
 * and some important details about the users
 */

/**
 * Main method. This method gets the list of enabled office365 users and shows their key fields particularly the
 * microsoft license associated with them
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  // gets all Azure AD users that are enabled
  let users = Fluency_ResourceLoad("Office365", "user", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let key = obj["@key"]
    let {displayName, accountEnabled, companyName, jobTitle, assignedLicenses, roles, userType, groups, passwordPolicies, usageLocation} = fields
    let {authMethods} = fields.userRegistration
    if (!accountEnabled) {
      return null
    }
    // gets the license details from the entity list using the assignedLicenses field
    let skuids = assignedLicenses.Map((k, v) => v.skuId)
    let licenses = skuids.Map((k, v) => {
      let {exist, value} = Fluency_EntityinfoLookup("Microsoft License List", "SKUID", v, "Product name")
      if (exist) {
        return value
      } else {
        return 'N/A'
      }
    })
    return {displayName, key, companyName, jobTitle, skuids, licenses, roles, userType, groups, passwordPolicies, usageLocation, authMethods}
  })

  users = users.Sort(0, "+displayName")

  return {
    users
  }
}
