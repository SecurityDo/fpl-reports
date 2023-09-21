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
  let organizeByOS = agentsTable.Aggregate(({osName}) => {
    return {groupBy: {osName}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByType = agentsTable.Aggregate(({osType}) => {
    return {groupBy: {osType}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByGroup = agentsTable.Aggregate(({groupName}) => {
    return {groupBy: {groupName}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeBySite = agentsTable.Aggregate(({siteName}) => {
    return {groupBy: {siteName}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByInfected = agentsTable.Aggregate(({infected}) => {
    return {groupBy: {infected}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByModel = agentsTable.Aggregate(({modelName}) => {
    return {groupBy: {modelName}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByAgent = agentsTable.Aggregate(({agentVersion}) => {
    return {groupBy: {agentVersion}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")

  return {agentsTable, totalSIAgents, organizeByOS, organizeByType, organizeByGroup, organizeBySite, organizeByInfected, organizeByModel, organizeByAgent}
}