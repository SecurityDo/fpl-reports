/**
 * @file SentinelOne_Asset_Information
 * @reportoverview A summary report of the deployed SentinelOne agents in the tenant. The report includes the
 * total number of deployed agents as well as statistics table based on the OS< OS Type, Group, Site, Infected Status, 
 * Model, and Agent Version.
 */

/**
 * Main method. This method calls the Fluency_ResourceLoad function to get the list of sentinel one agents in the tenant.
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  let agentsTable = Fluency_ResourceLoad("CloudFunnel", "agent", "*", (obj, customer) => {
    let fields = obj["@sentinelOneAgent"]
    let {uuid, computerName, groupName, siteName, isActive, machineType, mitigationMode, mitigationModeSuspicious, modelName, osName, osType, activeThreats, agentVersion, externalIp, infected, isDecommissioned, lastActiveDate} = fields
    if (isDecommissioned) {
      return null
    }
    return {
      aggregate: {
        groupBy: {uuid},
        columns: {
          argmax: {
            lastActiveDate,
            computerName,
            groupName,
            siteName,
            isActive,
            machineType,
            mitigationMode,
            mitigationModeSuspicious,
            modelName,
            osName,
            osType,
            activeThreats,
            agentVersion,
            externalIp,
            infected,
            isDecommissioned
          }
        }
      }
    }
  })
  let totalSIAgents = agentsTable.Aggregate(({}) => {
    return {columns: {count: {totalDeviceCount: true}}}
  })

  let organizeByOS = organizeByField(agentsTable, "osName")
  let organizeByType = organizeByField(agentsTable, "osType")
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

/**
 * This method groups the agents by the field and returns the top 10 agents with the highest count of that field.
 * 
 * @param {Table} agentsTable - The table containing the list of agents
 * @param {string} field - The field to group by
 * 
 * @returns {Table} - Returns the top 10 agents with the highest count of the field
 */
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
