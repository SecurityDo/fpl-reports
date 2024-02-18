/**
 * @file MFA_Report
 * @reportoverview A summary report of the MFA status of users in Office 365. This report shows the details on
 * MFA unregistered users, users with MFA disabled and MFA unregistered users with roles.
 */

/**
 * Main method. The method calls the loadMFAUnregisteredUsers, loadMFADisabledUsers and loadUsersWithRoles methods
 * to load the data and returns them.
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  let unregisteredUsers = loadMFAUnregisteredUsers()
  let authDisabledUsers = loadMFADisabledUsers()
  let usersWithRoles = loadUsersWithRoles()

  return {
    unregisteredUsers,
    authDisabledUsers,
    usersWithRoles
  }
}
/**
 * This method loads the data on Office 365 users who are not registered for MFA from the vendor.
 * 
 * @returns {Table} table - Returns a table containing details on users who are not registered for MFA
 */
function loadMFAUnregisteredUsers() {
  let table = Fluency_ResourceLoad("Office365", "User", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let {createdDateTime, userPrincipalName, displayName, accountEnabled, roles} = fields
    let mfaRegistered = fields?.userRegistration?.isMfaRegistered
    if (mfaRegistered != false || !accountEnabled) {
      return null
    }
    let createdOn = new Time(createdDateTime)
    createdOn = createdOn.UnixMilli()
    return {
      createdDateTime,
      userPrincipalName,
      displayName,
      accountEnabled,
      roles,
      mfaRegistered,
      createdOn
    }
  })
  return table
}

/**
 * This method loads the data on Office 365 users who have MFA disabled from the vendor.
 * 
 * @returns {Table} table - Returns a table containing details on users who have MFA disabled
 */
function loadMFADisabledUsers() {
  let table =  Fluency_ResourceLoad("Office365", "User", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let {createdDateTime, userPrincipalName, displayName, accountEnabled, roles} = fields
    let mfaRegistered = fields?.userRegistration?.isMfaRegistered
    let authEnabled = fields?.userRegistration?.isEnabled
    if (!mfaRegistered || !accountEnabled || authEnabled != false) {
      return null
    }
    let createdOn = new Time(createdDateTime)
    createdOn = createdOn.UnixMilli()
    return {
      createdDateTime,
      userPrincipalName,
      displayName,
      accountEnabled,
      roles,
      mfaRegistered,
      authEnabled,
      createdOn
    }
  })
  return table
}

/**
 * This method loads from the vendor data on Office 365 users who have roles but have MFA unregistered.
 * 
 * @returns {Table} table - Returns a table containing details on users who have MFA disabled
 */
function loadUsersWithRoles() {
  let table =  Fluency_ResourceLoad("Office365", "User", "*", (obj, customer) => {
    let fields = obj["@office365User"]
    let {createdDateTime, userPrincipalName, displayName, accountEnabled, roles} = fields
    let mfaRegistered = fields?.userRegistration?.isMfaRegistered
    let authEnabled = fields?.userRegistration?.isEnabled
    if (!accountEnabled || !roles || len(roles) == 0) {
      return null
    }
    if (mfaRegistered && authEnabled) {
      return null
    }
    let createdOn = new Time(createdDateTime)
    createdOn = createdOn.UnixMilli()
    return {
      createdDateTime,
      userPrincipalName,
      displayName,
      accountEnabled,
      roles,
      mfaRegistered,
      authEnabled,
      createdOn
    }
  })
  return table
}