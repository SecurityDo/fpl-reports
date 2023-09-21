function main () {
  let agentsTable = Fluency_ResourceLoad("Falcon", "agent", "*", (obj, customer) => {
    let fields = obj["@falconAgent"]
    let {hostname, mac_address, serial_number, modified_timestamp, provision_status, os_version, platform_name, agent_version, product_type_desc, system_manufacturer, system_product_name} = fields
    if (provision_status != "Provisioned") {
        return null
    }
    return {hostname, mac_address, serial_number, modified_timestamp, provision_status, os_version, platform_name, agent_version, product_type_desc, system_manufacturer, system_product_name}
  })
  let totalFalconAgents = agentsTable.GroupBy(() => {
    return {columns: {count: {totalDeviceCount: true}}}
  })
  let loadUniqueFalconByMAC = agentsTable.GroupBy(({mac_address}) => {
    return {columns: {dcount: {totalCount: mac_address}}}
  })
  let loadUniqueFalconByHostname = agentsTable.GroupBy(({hostname}) => {
    return {columns: {dcount: {totalCount: hostname}}}
  })
  let loadUniqueFalconBySerial = agentsTable.GroupBy(({serial_number}) => {
    return {columns: {dcount: {totalCount: serial_number}}}
  })
  let falconAgentsBySerial = agentsTable.Aggregate(({serial_number, modified_timestamp}) => {
    return {groupBy: {serial_number}, columns: {max: {modified_timestamp}}}
  })
  let agentsTableFinal = falconAgentsBySerial.Clone().Join(agentsTable, ({serial_number, modified_timestamp}) => "inner")
  let organizeByOS = agentsTableFinal.Aggregate(({os_version}) => {
    return {groupBy: {os_version}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByAgent = agentsTableFinal.Aggregate(({agent_version}) => {
    return {groupBy: {agent_version}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByPlatform = agentsTableFinal.Aggregate(({platform_name}) => {
    return {groupBy: {platform_name}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByManufacturer = agentsTableFinal.Aggregate(({system_manufacturer}) => {
    return {groupBy: {system_manufacturer}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")
  let organizeByProdName = agentsTableFinal.Aggregate(({system_product_name}) => {
    return {groupBy: {system_product_name}, columns: {count: {totalCount: true}}}
  }).Sort(10, "-totalCount")


  return {agentsTable, totalFalconAgents, loadUniqueFalconByMAC, loadUniqueFalconByHostname, loadUniqueFalconBySerial, falconAgentsBySerial, agentsTableFinal, organizeByOS, organizeByAgent, organizeByPlatform, organizeByManufacturer, organizeByProdName}
}
