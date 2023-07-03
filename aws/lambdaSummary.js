function getLambdaCost(assetTable) {
  let options = {from: "-24h@h", to: "@h", dimensions: ["FunctionName"], namespace: "AWS/Lambda", period: "1h", stat: "Sum"}
  let filters = {FunctionName: assetTable}
  // let duration = metric("Duration").stat("Sum")
  let duration = AWS_GetMetric("Duration", options, filters)
  let invocation = AWS_GetMetric("Invocations", options, filters)
 
  // generate durationCost as a new metric from duration metric
  let durationCost = transform(duration, (ts, key, value) => (value/1000) * assetTable[key].lambdaMemoryRate )
  let invocationCost = transform(invocation, (ts, key, value) => value * assetTable[key].lambdaRequestRate )
  
  // generate cost metric from the sum of the two metric stream.  
  let cost = durationCost + invocationCost
  return {cost, duration, invocation}
}


/*
 *   This report list all lambdas with the cost in last 24 hours
 *   The lambda pricing is calculated based on the preconfigured memory size and the running durations.
 *   also the rate depends on the architecture chosen. So we add pricing rate for memory and request as two extra columns.
*/
function main() {
  let {lambdaFunctions, cost, duration, invocation} =  AWS_AccountRegionLambda("*", "*", (account, region) => {

    // return null to skip one row	  
    let lambdaFunctions = AWS_LoadAsset("lambda:function", (obj) => {
       let ID = obj.FunctionName
       let MemorySize = obj.MemorySize
       let Architecture = obj.Architectures[0]
       let NewID = sprintf("%s_%s",ID, Architecture)
       // if (Architecture != "x86_64") {
       //   return null
       // }
       let lambdaMemoryRate = AWS_GetPrice("Lambda", "GB-Second", {Architecture: Architecture}) * (MemorySize/1024)
       let lambdaRequestRate = AWS_GetPrice("Lambda", "Request", {Architecture: Architecture})
       // printf("%s:%s size type %s", account, region, typeof(MemorySize))
       return {ID, MemorySize, Architecture, NewID, lambdaMemoryRate, lambdaRequestRate}
    })

    if lambdaFunctions.IsEmpty() {
      return {lambdaFunctions}
    }
    let {duration, invocation, cost} = getLambdaCost(lambdaFunctions)
    return  {lambdaFunctions, cost, duration, invocation}
  })

  // remove the extra column for pricing calculation	
  lambdaFunctions.RemoveColumn("lambdaMemoryRate")
  lambdaFunctions.RemoveColumn("lambdaRequestRate")

  // convert cost metric as a summary column	
  lambdaFunctions.JoinStream(cost, "sum", "TotalCost", "$")
  lambdaFunctions.SetColumnUnit("MemorySize", "MB")
  return {lambdaFunctions, cost, duration, invocation}
}

