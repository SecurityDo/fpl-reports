/**
 * @file Cylance
 * @reportoverview A summary report that uses the Cylance plugin to get the threats detected by Cylance and process them into a table.
 */

/**
 * Main method. This calls the Cylance plugin to get the threats detected and extracts the relevant information for the threats particularly
 * the file path and the devices that detected the threat.
 * 
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  return pluginLambda("Cylance", "*", (customer) => {      
    let threats = Cylance_LoadThreat({start_time: "-7d"}, (obj) => {
      let {sha256, md5, name, global_quarantined,safelisted,  classification, sub_classification} = obj
      let ID = uuid()
          return {ID, sha256, name, global_quarantined, classification, safelisted, sub_classification, customer}
      })
    threats.NewColumns( ({sha256}) => {
        let devices = Cylance_GetThreatDevices(sha256)
        let filePaths = []
        for (let i = 0; i < len(devices); i++) {
          let device = devices[i]
          filePaths = append(filePaths, device.name + device.file_path) 
        }
        let info = Cylance_GetThreatInfo(sha256) 
        return {filePaths, detected_by: info.detected_by}
    })  
    return {threats}
  })
}
