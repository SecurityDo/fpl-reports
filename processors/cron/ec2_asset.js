
function main() {
    // 
    let {instances, volumes} = AWS_AccountRegionLambda("FluencyPlatform", "*", (account, region) => {
      let volumes = AWS_LoadAsset("ec2:volume", (obj) => {
         let {VolumeId:ID, VolumeType, State, Encrypted, Iops, Size, Throughput}  = obj
         let InstanceId, Device
         if obj.Attachments && len(obj.Attachments) > 0 {
           InstanceId = obj.Attachments[0].InstanceId
           Device = obj.Attachments[0].Device
         }
         // let { InstanceId, Device } = obj.Attachments[0]
         // filter by properties
         //if VolumeType != "gp2" {
         //   return null
         //}
         return {ID, VolumeType, State, Encrypted, Iops, Size, InstanceId, Device, Throughput}
      })
      let instanceMap = {}
      volumes.Each( ({ID, VolumeType,Size, InstanceId, Device}) => {
           if !InstanceId {
              return
           }
           let volumeList = instanceMap[InstanceId]
           if !volumeList {
              instanceMap[InstanceId] = [{VolumeType,Size,Device}]
           } else {
              volumeList = append(volumeList, {VolumeType,Size,Device})
              instanceMap[InstanceId] = volumeList
           }
      })

      let instances = AWS_LoadAsset("ec2:instance", (obj) => {
         let ID = obj.InstanceId
         let InstanceType = obj.InstanceType
         let Architecture = obj.Architecture
         let State = obj.State.Name
         
         if State == "terminated" {
            return null
         }
         
         let Platform = obj.PlatformDetails
         let Tenancy = obj.Placement?.Tenancy
         let PrivateIP = obj.PrivateIpAddress
         let PublicIP = obj.PublicIpAddress
         let LaunchTime = obj.LaunchTime
         let Name = jsonGetAWSTag(obj, "Name")
         //let App = jsonGetAWSTag(obj, "lvdb-app")
         let Customer = jsonGetAWSTag(obj, "lvdb-account")
         return {ID, Name, Customer, InstanceType, Tenancy, Platform, Architecture, State, PrivateIP, PublicIP, LaunchTime}
      })
      
      instances.NewColumnLambda("Storage", "GB", ({ID, State}) => {
        
         let ebsList = instanceMap[ID]
         if !ebsList {
           printf("unknown instanceID %s: %s", ID, State)
           return ""
         }
         //printf("%v",ebsList)
         let infos = ebsList.Map( (_, {Device, VolumeType, Size}) => sprintf("%s:%s:%dGB",Device, VolumeType, Size))
         return infos.Join(",")         
      })
      
      return {instances}    
    })
    
    let list = instances.Map(({ID, Name, PrivateIP, PublicIP, State, InstanceType, Platform, Architecture, Storage, _region, _account}) => {
       return {
          Name,
          MachineType:InstanceType,
          PrivateIP,
          PublicIP,
          Region: _region,
          Account: _account,
          InstanceID: ID,
          Platform,
          Flags: [State]
       }
          
    
    })
    Platform_Asset_Refresh("AWSEC2", list)
    return {instances}
}

