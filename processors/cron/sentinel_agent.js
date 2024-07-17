function main() {
    let table = loadSentinelOneAgents()
    let list = table.Map( (row) => row)
    Platform_Asset_Refresh("SentinelOne", list)
    return {table}
}

function loadSentinelOneAgents() {
  let table =  Fluency_ResourceLoad("SentinelOne", "agent", "*", (obj, customer) => {
    let fields= obj["@sentinelOneAgent"]
    let {updatedAt, computerName:name, uuid:agentID, modelName:model, osName:os, machineType, lastIpToMgmt:privateIP, externalIp: publicIP} = fields
    let timestamp = obj["@timestamp"]
    if contains(name, ".") {
      let segments = split(name, ".")
      name = segments[0]
    }

    return {
      aggregate: {
        groupBy: {agentID},
        columns: {
          argmax: {
            updatedAt,
            name,
            model,
            privateIP,
            publicIP,
            os,
            machineType,
            customer,
            timestamp
          }
        }
      }
    }
  })
  return table
}
