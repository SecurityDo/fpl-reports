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

function main () {
  let agentsTable = Fluency_ResourceLoad("Falcon", "agent", "*", (obj, customer) => {
    let fields = obj["@falconAgent"]
    let {hostname, mac_address, serial_number, modified_timestamp, provision_status, os_version, platform_name, agent_version, product_type_desc, system_manufacturer, system_product_name} = fields
    if (provision_status != "Provisioned") {
        return null
    }
    return {
      hostname,
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
  })

  let totalFalconAgents = agentsTable.GroupBy(() => {
    return {
      columns: {
        count: {totalDeviceCount: true}
      }
    }
  })
  let falconAgentsBySerial = agentsTable.Aggregate(({serial_number, modified_timestamp}) => {
    return {
      groupBy: {serial_number},
      columns: {
        max: {modified_timestamp}
      }
    }
  })

  let loadUniqueFalconByMAC = loadUniqueFalconByField(agentsTable, "mac_address")
  let loadUniqueFalconByHostname = loadUniqueFalconByField(agentsTable, "hostname")
  let loadUniqueFalconBySerial = loadUniqueFalconByField(agentsTable, "serial_number")

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
