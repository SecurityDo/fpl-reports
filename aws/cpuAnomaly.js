// 30 day history
function getCPUUtilization(assetTable) {
  let options = {from:"-30d@h", to:"@h", dimensions:["InstanceId"], namespace:"AWS/EC2", period:"1h", stat:"Average", unit:"Percent"}
  let filters = {InstanceId:assetTable}
  let cpu = AWS_GetMetric("CPUUtilization", options, filters)
  return {cpu}
}


/*
 *     this report monitor a selected group of servers, detect anomaly in the last 12 hours, based on a 30-day hourly metric history
 */
function main() {
   let {cpuAlerts} = AWS_AccountRegionLambda("*", "*", (account, region) => {
     let instances = AWS_LoadAsset("ec2:instance", (obj) => {
       let ID = obj.InstanceId
       let InstanceType = obj.InstanceType
       let Architecture = obj.Architecture
       let State = obj.State.Name
       let Name = jsonGetAWSTag(obj, "Name")
       
       let App = jsonGetAWSTag(obj, "Application")
       if ((App == "analytic" || App == "indexer") && State == "running") {
          return {ID, InstanceType, Architecture, State, Name, Customer, App}
       }
       // skip this entry
       return null
     })

     // load last 30 hourly metric
     let {cpu} = getCPUUtilization(instances)
     
     // seasonal options: "" (no seasonal), "weekday-hourly", "weekday-end-hourly", "auto"
     let cpuAlerts = anomaly(cpu, "Server_CPU_Anomaly", "adaptive anomaly detection", {seasonal: "auto", minDiff: 3.0, minDiffPercent: 10.0})
     return {cpuAlerts}   
   })
   // send to incident manager
   cpuAlerts.Emit("Server_CPU_Anomaly", "adaptive anomaly detection", "error", 10800)

   // show top 10 anomalies. Note some anomaly may not trigger alerts
   cpuAlerts.Limit(10)
   return {cpuAlerts}
}


