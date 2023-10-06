function main() {
  let infected_systems = Fluency_ResourceLoad("SentinelOne", "agent", "*", (obj, customer) => {
    let fields = obj["@sentinelOneAgent"]
    let {infected, appsVulnerabilityStatus} = fields
    return {infected, appsVulnerabilityStatus}
  }).Aggregate(({infected, appsVulnerabilityStatus}) => {
    return {
      columns: {
        count: {total: true},
        sum: {infected},
        count: {patchNeeded: (appsVulnerabilityStatus == "patch_required")},
      }
    }
  })

  let issues = Fluency_ResourceLoad("SentinelOne", "agent", "*", (obj, customer) => {
    let fields = obj["@sentinelOneAgent"]
    let {agentID, asset, username} = fields.translation
    let {computerName, modelName, mitigationMode, infected, appsVulnerabilityStatus} = fields
    if (!infected && appsVulnerabilityStatus != "patch_required") {
      return null
    }
    return {agentID, asset, username, computerName, modelName, mitigationMode, infected, appsVulnerabilityStatus}
  })

  return {infected_systems, issues}
}