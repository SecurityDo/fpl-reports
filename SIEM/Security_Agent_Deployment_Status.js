function loadDevices() {
  return Fluency_ResourceLoad("fehx", "device", "*", (obj, customer) => {
    let fields = obj["@FEHxDevice"]
    let {_id:uuid, agent_version, hostname,last_poll_ip,last_poll_timestamp,primary_ip_address} = fields
    let osName = fields.os.product_name
    let normalize = toLower(hostname)
    return {
      aggregate: {
        groupBy: {normalize},
        columns: {
          argmax: {
            last_poll_timestamp,
            uuid,
            agent_version,
            hostname,
            last_poll_ip,
            primary_ip_address,
            osName
          },
        }
      }
    }
  })
}

function loadAgents() {
  return Fluency_ResourceLoad("Sentinelone", "agent", "*", (obj, customer) => {
    let fields= obj["@sentinelOneAgent"]
    let {agentVersion, lastActiveDate, uuid, machineType, computerName, isActive, isDecommissioned, mitigationMode, mitigationModeSuspicious, appsVulnerabilityStatus, infected, isUpToDate} = fields
    let normalize = toLower(computerName)
    return {
      aggregate: {
        groupBy: {normalize},
        columns: {
          argmax: {
            lastActiveDate,
            uuid,
            machineType,
            computerName,
            isActive,
            isDecommissioned,
            mitigationMode,
            mitigationModeSuspicious,
            appsVulnerabilityStatus,
            infected,
            isUpToDate,
            agentVersion
          }
        }
      }
    }
  })
}

function loadADAssets() {
  let assets = Fluency_ResourceLoad("AD", "asset", "*", (obj, cus) => {
    let fields= obj["@ADAsset"]
    let {customer, name, updatedOn, propertyFlags} = fields
    if (propertyFlags.Some((i,v) => v == "ACCOUNTDISABLE") || Fluency_EntityinfoCheck("JetAviation_EndPoint_Protection_Review_Whitelist", name)) {
      return null
    }
    let normalize = toLower(name)
    return {
      aggregate: {
        groupBy: {normalize},
        columns: {
          argmax: {
            updatedOn,
            propertyFlags, 
            customer
          }
        }
      }
    }
  })
  return assets.Aggregate(({normalize, updatedOn, propertyFlags, customer}) => {
    return {
        groupBy: {normalize},
        columns: {
          argmax: {
              updatedOn,
              propertyFlags
          },
          values: {customers: customer}
        }
    }
  })
}

function loadADJoinedAssets() {
  return Fluency_ResourceLoad("Office365", "device", "*", (obj, customer) => {
    let fields= obj["@office365Device"]
    let {registrationDateTime, enrollmentProfileName, accountEnabled, operatingSystem, enrollmentType} = fields
    let name = fields.displayName
    if (enrollmentType != "AzureDomainJoined" || operatingSystem != "Windows" || !accountEnabled) {
      return null
    }
    let normalize = toLower(name)
    return {
      aggregate: {
        groupBy: {normalize},
        columns: {
          values: {customers: enrollmentProfileName},
          argmax: {updatedOn: registrationDateTime}
        }
      }
    }
  })
}

function loadQualysDevices() {
  return Fluency_ResourceLoad("Qualys", "host", "*", (obj, customer) => {
    let fields= obj["@qualysHost"]
    let {domain, address, netbiosName, os, created, location} = fields
    let qualysAgentVersion = fields.agentVersion
    let normalize = toLower(netbiosName)
    return {
      aggregate: {
        groupBy: {normalize},
        columns: {
          argmax: {
            created,
            domain,
            address,
            os,
            location,
            qualysAgentVersion
          }
        }
      }
    }
  })
}

function main() {
  // part 1: expand the ad asset table with other edr information
  let devices = loadDevices()
  let agents = loadAgents()
  let qualysDevices = loadQualysDevices()
  let assets = loadADAssets()
  let joinedAssets = loadADJoinedAssets()
  let deploymentStatusTable = assets.Clone().Append(joinedAssets)
  deploymentStatusTable.Join(agents, ({normalize}, {agentVersion}) => "fullouter")
  deploymentStatusTable.Join(devices, ({normalize}, {agent_version, osName}) => "fullouter")
  deploymentStatusTable.Join(qualysDevices, ({normalize}, {qualysAgentVersion}) => "fullouter")
  // part 2: creating a merged table by edr and edrInfo
  let devices2 = devices.Clone().NewColumns(({agent_version, last_poll_timestamp}) => {
    let edr = "FireEyeHx:" + agent_version
    let edrInfo = "FireEyeHx:lastUpdate:" + last_poll_timestamp
    return {
      edr,
      edrInfo
    }
  })
  devices2 = devices2.Clone("normalize", "edr", "edrInfo")
  let agents2 = agents.Clone().NewColumns(({agentVersion, lastActiveDate}) => {
    let edr = "SentinelOne:" + agentVersion
    let edrInfo = "SentinelOne:lastUpdate:" + lastActiveDate
    return {
      edr,
      edrInfo
    }
  })
  agents2 = agents2.Clone("normalize", "edr", "edrInfo")
  let qualysDevices2 = qualysDevices.Clone().NewColumns(({qualysAgentVersion, created}) => {
    let edr = "Qualys:" + qualysAgentVersion
    let edrInfo = "Qualys:lastUpdate:" + created
    return {
      edr,
      edrInfo
    }
  })
  qualysDevices2 = qualysDevices2.Clone("normalize", "edr", "edrInfo")
  let normalizedAssets = mergeTable(devices2, agents2, qualysDevices2).Aggregate(({normalize, edr, edrInfo}) => {
    return {
      groupBy: {normalize},
      columns: {
        values: {edr},
        values: {edrInfo}
      }
    }
  })
  // part 3: obtain some statistics for graphs
  let conditionTable = deploymentStatusTable.Clone().NewColumns(({agent_version, agentVersion, qualysAgentVersion}) => {
    let hasFe = agent_version ? "Assets with agent" : "Assets without agent"
    let hasS1 = agentVersion ? "Assets with agent" : "Assets without agent"
    let hasQu = qualysAgentVersion ? "Assets with agent" : "Assets without agent"
    let isCompliant = (agent_version && agentVersion && qualysAgentVersion) ? "Compliant assets" : "Non-compliant assets"
    return {
      hasFe,
      hasS1,
      hasQu,
      isCompliant
    }
  })
  let hasFEDist = conditionTable.Aggregate(({hasFe, normalize}) => {
    return {
      groupBy: {hasFe},
      columns: {
        dcount: {numberOfDevices: normalize}
      }
    }
  })
  let hasS1Dist = conditionTable.Aggregate(({hasS1, normalize}) => {
    return {
      groupBy: {hasS1},
      columns: {
        dcount: {numberOfDevices: normalize}
      }
    }
  })
  let hasQuDist = conditionTable.Aggregate(({hasQu, normalize}) => {
    return {
      groupBy: {hasQu},
      columns: {
        dcount: {numberOfDevices: normalize}
      }
    }
  })
  let isCompliantDist = conditionTable.Aggregate(({isCompliant, normalize}) => {
    return {
      groupBy: {isCompliant},
      columns: {
        dcount: {numberOfDevices: normalize}
      }
    }
  })
  return {
    deploymentStatusTable,
    normalizedAssets,
    hasFEDist,
    hasS1Dist,
    hasQuDist,
    isCompliantDist
  }
}