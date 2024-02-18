/**
 * @file Falcon_Agent_Stats
 * @reportoverview This report laods the Falcon agent data from the Falcon plugin and processes it into tables where
 * the status of the Falcon agent is not Provisioned. It also groups the data by OS, agent version, platform, manufacturer,
 * product name, and product type.
 */

/**
 * Main method. The method loads the falcon agent data then process it into tables grouped by the different fields.
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main () {
  let agentsTable = new Table()
  agentsTable = Fluency_ResourceLoad("Falcon", "agent", "*", (obj, customer) => {
    let fields = obj["@falconAgent"]
    let {hostname, mac_address, serial_number, modified_timestamp, provision_status, os_version, platform_name, agent_version, product_type_desc, system_manufacturer, system_product_name} = fields
    if (provision_status != "Provisioned") {
        return null
    }
    return {
      aggregate: {
        groupBy: {hostname},
        columns: {
          argmax: {
            mac_address,
            serial_number,
            modified_timestamp,
            provision_status,
            os_version,
            platform_name,
            agent_version,
            product_type_desc,
            system_manufacturer,
            system_product_name
          }
        }
      }
    }
  })

  // gets the total number of falcon agents
  let totalFalconAgents = agentsTable.GroupBy(() => {
    return {
      columns: {
        count: {totalDeviceCount: true}
      }
    }
  })
  // get the latest modified_timestamp for each serial_number
  let falconAgentsBySerial = agentsTable.Aggregate(({serial_number, modified_timestamp}) => {
    return {
      groupBy: {serial_number},
      columns: {
        max: {modified_timestamp}
      }
    }
  })

  // load unique falcon agents by mac_address, hostname, and serial_number
  let loadUniqueFalconByMAC = loadUniqueFalconByField(agentsTable, "mac_address")
  let loadUniqueFalconByHostname = loadUniqueFalconByField(agentsTable, "hostname")
  let loadUniqueFalconBySerial = loadUniqueFalconByField(agentsTable, "serial_number")

  // sorts tbe falcon agents by the different fields
  let agentsTableFinal = falconAgentsBySerial.Clone().Join(agentsTable, ({serial_number, modified_timestamp}) => "inner")
  let organizeByOS = organizeByField(agentsTableFinal, "os_version")
  let organizeByAgent = organizeByField(agentsTableFinal, "agent_version")
  let organizeByPlatform = organizeByField(agentsTableFinal, "platform_name")
  let organizeByManufacturer = organizeByField(agentsTableFinal, "system_manufacturer")
  let organizeByProdName = organizeByField(agentsTableFinal, "system_product_name")
  let organizeByProdType = organizeByField(agentsTableFinal, "product_type_desc")

  return {
    totalFalconAgents,
    loadUniqueFalconByMAC,
    loadUniqueFalconByHostname,
    loadUniqueFalconBySerial,
    falconAgentsBySerial,
    agentsTableFinal,
    organizeByOS,
    organizeByAgent,
    organizeByPlatform,
    organizeByManufacturer,
    organizeByProdName,
    organizeByProdType
  }
}

/**
 * This method aggregates the agents table by the field passed in and gets the number of unique values for that field.
 * 
 * @param {Table} agentsTable - the table containing the falcon agent data 
 * @param {string} field  - the field to group by
 * 
 * @returns {Table} - Returns a table containing the number of unique values for the field passed in
 */
function loadUniqueFalconByField(agentsTable, field) {
  return agentsTable.Aggregate((obj) => {
    let fieldValue = obj[field]
    return {
      columns: {
        dcount: {totalCount: fieldValue}
      }
    }
  })
}

/**
 * This method aggregates the agents table by the field passed in and gets the number of unique values for that field.
 * 
 * @param {Table} agentsTable - the table containing the falcon agent data 
 * @param {string} field  - the field to group by
 * 
 * @returns {Table} - Returns a table containing the top 10 values for the field passed in and the total number of occurences for each value
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
