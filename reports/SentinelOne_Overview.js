/**
 * @file SentinelOne_Overview
 * @reportoverview A summary report for the list of sentinel one agent issues and infected systems. 
 */

/**
 * Main method. This method gets the list of infected sentinel one agents and the list of sentinel one
 * agents with issues from the tenant.
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  let infected_systems = Fluency_ResourceLoad("SentinelOne", "agent", "*", (obj, customer) => {
    let fields = obj["@sentinelOneAgent"]
    let {infected, appsVulnerabilityStatus} = fields
    return {infected, appsVulnerabilityStatus}
  })
  infected_systems = infected_systems.Aggregate(({infected, appsVulnerabilityStatus}) => {
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

  return {
    infected_systems,
    issues
  }
}