function loadMFAUnregisteredUsers() {
  return Fluency_ResourceLoad("Office365", "User", "*", (obj, customer) => {
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
}

function loadMFADisabledUsers() {
  return Fluency_ResourceLoad("Office365", "User", "*", (obj, customer) => {
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
}

function loadUsersWithRoles() {
  return Fluency_ResourceLoad("Office365", "User", "*", (obj, customer) => {
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
}

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