function main() {
    let table = loadAzureADDevices() 
    let list = table.Map( (row) => row)
    Platform_Asset_Refresh("AzureAD", list)
    return {table}
}

function getName(hostnames) {
   for i, v = range hostnames {
      if !contains(v, ".") {
         return v
      }
   }
   return ""
}
function getLongName(hostnames) {
   for i, v = range hostnames {
      if contains(v, ".") {
         return v
      }
   }
   return ""
}


function loadAzureADDevices() {
  let table =  Fluency_ResourceLoad("Office365", "device", "*", (obj, customer) => {
    let fields= obj["@office365Device"]
    let {approximateLastSignInDateTime, accountEnabled, hostnames, displayName, operatingSystem:os, operatingSystemVersion:osVersion, profileType, trustType, username} = fields
    let timestamp = obj["@timestamp"]
    
    // skip disabled account
    if !accountEnabled {
       return null
    }
    let name = getName(hostnames)
    let fqdn = getLongName(hostnames)
    if !name {
       name = displayName
    }
    
    return {
      aggregate: {
        groupBy: {name},
        columns: {
          argmax: {
            approximateLastSignInDateTime,
            fqdn,
            displayName,
            os,
            osVersion,
            profileType,
            trustType,
            customer
          }
        }
      }
    }
  })
  return table
}
