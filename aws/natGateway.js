function getNatBandwidth(assetTable) {
 let options = {from: "-24h@h", to: "@h", dimensions: ["NatGatewayId"], namespace: "AWS/NATGateway", period: "1h", stat: "Sum", unit:"Byte"}
 let filters = {NatGatewayId: assetTable}
 let download = AWS_GetMetric("BytesInFromDestination", options, filters)
 let upload = AWS_GetMetric("BytesOutToDestination", options, filters)
 let localUpload = AWS_GetMetric("BytesInFromSource", options, filters)
 let localDownload = AWS_GetMetric("BytesOutToSource", options, filters)
 let totalBytes = download + upload + localUpload + localDownload
 let processCost = AWS_GetPrice("NatGateway", "GB")
 let hourlyCost =  AWS_GetPrice("NatGateway", "Hour")
  let cost = (hourlyCost * 3600 / totalBytes.GetInterval()) +  totalBytes * processCost / (1024 * 1024 * 1024)
 // let cost = totalBytes * processCost / (1024 * 1024 * 1024)
 return {download, upload, totalBytes, cost}
}

/*
   This report list all Managed Nat Gateways and sort them by cost in last 24 hours
*/
function main() {
  let {natGateways} = AWS_AccountRegionLambda("*", "*", (account, region) => {

    // load all nat gateways
    let natGateways = AWS_LoadAsset("ec2:natgateway", (obj) => {
        let {NatGatewayId:ID, State, VpcId} = obj
        let PublicIp = obj.NatGatewayAddresses[0].PublicIp
        return {ID, State, VpcId, PublicIp}
    })
    if natGateways.IsEmpty() {
      return {natGateways}
    }

    // calculate cost from metrics
    let {download, upload, totalBytes, cost} = getNatBandwidth(natGateways)
    natGateways.JoinStream(totalBytes,"Sum", "TotalBytes", "Byte")
    natGateways.JoinStream(cost, "Sum", "Cost", "$")
    return {natGateways}
  })

  natGateways.Sort(0, "Cost")
  return {natGateways}
}

