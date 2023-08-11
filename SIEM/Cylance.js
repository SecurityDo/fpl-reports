function main() {
  return pluginLambda("Cylance",   "*", (customer) => {      
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
