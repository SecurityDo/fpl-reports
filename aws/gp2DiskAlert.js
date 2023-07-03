function getGp2BurstBalance(assetTable) {
  let options = {from:"-24h@h", to:"@h", dimensions:"VolumeId", namespace:"AWS/EBS", period:"5m", stat:"Average", unit:"Percent"}
  let filters = {VolumeId:assetTable}
  let balance = AWS_GetMetric("BurstBalance", options, filters)
  return balance
}


// check if gp2 volumes is running below 80% of the burst balance 
function main() {
   return AWS_AccountRegionLambda("*", "*", () => {
       // list all volumes
       let volumes = AWS_LoadAsset("ec2:volume", (obj) => {
         let {VolumeId:ID, VolumeType, State, Encrypted, Iops, Size}  = obj
         let { InstanceId, Device } = obj.Attachments[0]
         // filter by properties
         if VolumeType != "gp2" {
            return null
         }
         return {ID, VolumeType, State, Encrypted, Iops, Size, InstanceId, Device} 
       })
       
       // list all instances
       let instances = AWS_LoadAsset("ec2:instance", (obj) => {
          let {InstanceId: ID, InstanceType, Architecture} = obj
          let State = obj.State.Name
          let Name = jsonGetAWSTag(obj, "Name")
          return {ID, Name, InstanceType, Architecture, State }
       })
       if volumes.IsEmpty() {
          return {}
       }
       // get instance name 	   
       volumes.Join(instances, {ID: "InstanceId"}, {Name: "InstanceName"})

       // get BurstBalance metrics in the last 24 hours
       let balance = getGp2BurstBalance(volumes)

       // detect if the burstbalance is below 80% for 10 minutes ( 2 slots, 2 over 2)	   
       let balanceAlert = alert(balance, window(balance < 80, 2, 2))
   
       return {balanceAlert}       
   })

}
