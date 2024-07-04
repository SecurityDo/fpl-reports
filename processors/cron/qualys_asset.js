function main() {
    let table = loadQualysDevices() 
    let list = table.Map( (row) => row)
    Platform_Asset_Refresh("Qualys", list)
    return {table}
}

function loadQualysDevices() {
  let table =  Fluency_ResourceLoad("Qualys", "host", "*", (obj, customer) => {
    let fields= obj["@qualysHost"]
    let {created, name, fqdn, model, manufacturer:vendor, os, type:machineType, address:privateIP} = fields
    let timestamp = obj["@timestamp"]
    return {
      aggregate: {
        groupBy: {fqdn},
        columns: {
          argmax: {
            created,
            name,
            model,
            privateIP,
            os,
            machineType,
            vendor,
            customer,
            timestamp
          }
        }
      }
    }
  })
  return table
}

