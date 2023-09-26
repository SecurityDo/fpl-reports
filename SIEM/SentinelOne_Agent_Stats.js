function organizeByField(agentsTable, field) {
  return agentsTable.Aggregate((obj) => {
    let fieldValue = obj[field]
    return {
      groupBy: {[field]: fieldValue},
      columns: {
        count: {totalCount: true}
      }
    }
  }).Sort(10, "-totalCount")
}

function main() {
  let agentsTable = Fluency_ResourceLoad("SentinelOne", "agent", "*", (obj, customer) => {
    let fields = obj["@sentinelOneAgent"]
    let {uuid, computerName, groupName, siteName, isActive, machineType, mitigationMode, mitigationModeSuspicious, modelName, osName, osType, activeThreats, agentVersion, externalIp, infected, isDecommissioned} = fields
    if (isDecommissioned) {
        return null
    }
    return {uuid, computerName, groupName, siteName, isActive, machineType, mitigationMode, mitigationModeSuspicious, modelName, osName, osType, activeThreats, agentVersion, externalIp, infected, isDecommissioned}
  })
  let totalSIAgents = agentsTable.Aggregate(({}) => {
    return {columns: {count: {totalDeviceCount: true}}}
  })

  let organizeByOS = organizeByField(agentsTable, "osName")
  let organizeByType = organizeByField(agentsTable, "machineType")
  let organizeByGroup = organizeByField(agentsTable, "groupName")
  let organizeBySite = organizeByField(agentsTable, "siteName")
  let organizeByInfected = organizeByField(agentsTable, "infected")
  let organizeByModel = organizeByField(agentsTable, "modelName")
  let organizeByAgent = organizeByField(agentsTable, "agentVersion")

  return {
    agentsTable,
    totalSIAgents,
    organizeByOS,
    organizeByType,
    organizeByGroup,
    organizeBySite,
    organizeByInfected,
    organizeByModel,
    organizeByAgent
  }
}