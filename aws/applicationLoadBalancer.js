/*
  This report list all application Load Balancer and sort them by cost in 
  the last 24 hours
*/
function main() {
  let {lbs} =  AWS_AccountRegionLambda("*", "*", () => {

    // load all vpcs to get VPC name from VpcId
    let vpcs = AWS_LoadAsset("ec2:vpc", (obj) => {
        let {VpcId:ID, CidrBlock, IsDefault} = obj
        let Name = jsonGetAWSTag(obj, "Name")
        return {ID, CidrBlock, Name, IsDefault}
    })

    // load application load balancer
    // note the ID is not Name. It's extracted from the Arn. This is the ID used by Cloudwatch metrics
    let lbs = AWS_LoadAsset("elasticloadbalancing:loadbalancer", (obj) => {
        let {LoadBalancerName:Name, Type, Scheme, VpcId, LoadBalancerArn:Arn} = obj
        let segments = split(Arn, ":")
        let resourceID = segments[len(segments)-1]
        let ID = trimPrefix(resourceID, "loadbalancer/") 
        return {ID, Name, Type, Scheme, VpcId}
    })
    

    // Get VpcName from VpcId field
    lbs.Join(vpcs, {ID:"VpcId"},{Name:"VpcName",CidrBlock:"CidrBlock"})

    // Get "ProcessedBytes" and "ConsumedLCUs" metrics in last 24 hours
    let options = {from:"-24h@h", to:"@h", dimensions:"LoadBalancer", namespace:"AWS/ApplicationELB", period:"1h", stat:"Sum", unit: "Byte"}
    let processedBytes = AWS_GetMetric("ProcessedBytes", options, {LoadBalancer: lbs})
    options.unit = "Count"
    let lcu = AWS_GetMetric("ConsumedLCUs", options, {LoadBalancer: lbs})

    // ApplicatioinLoadBalancer price has two part: the Hour rate and LCU rate
    let albHourRate = AWS_GetPrice("ApplicationLoadBalancer", "Hour")
    let albLCURate = AWS_GetPrice("ApplicationLoadBalancer", "LCU-Hour")

    // generate a cost metric stream from the LCU metric stream
    let cost = transform(lcu, (ts, key, value) => (value * albLCURate) + albHourRate)

    // append two new columns to the LoadBalancer table
    lbs.JoinStream(processedBytes, "Sum", "ProcessedBytes", "Byte")
    lbs.JoinStream(cost, "Sum", "Cost", "Dollar")
    return {lbs}
  })
 
  // Sort by Cost column in descending order
  // keep all entries 
  lbs.Sort(0, "Cost")
  return {lbs}
}

