/**
 * Main method. This method is a skeleton method of loading sentinelone agents. 
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  let agents = Fluency_ResourceLoad("SentinelOne", "agent", "*", (obj, customer) => {
    let fields = obj["@sentinelOneAgent"]
    let {agentVersion, lastActiveDate, uuid, machineType, computerName, isActive, isDecommissioned, mitigationMode, mitigationModeSuspicious, appsVulnerabilityStatus, infected, isUpToDate} = fields       
    return {
      aggregate:{
        groupBy:{computerName},
        columns: {
          argmax: {lastActiveDate, agentVersion, uuid, machineType, computerName, isActive, isDecommissioned, mitigationMode, mitigationModeSuspicious, appsVulnerabilityStatus, infected, isUpToDate, customer},
          count: {nameCount:true}
        }
      }
    } 
  })
  agents.Sort(-1, "nameCount")
  return {agents}
}
