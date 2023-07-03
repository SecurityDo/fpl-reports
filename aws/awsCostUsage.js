
// this report convert AWS Cost and Usage API call to metric streams
function main() {
  let {dailyCostByService} = AWS_AccountLambda("*", (account) => {
    let dailyCostByService=AWS_GetCostUsage({from:"-30d@d", to:"-1d@d", metric:"BlendedCost", granularity:"DAILY", dimensions:"SERVICE"})
    return {dailyCostByService}  
  })
  dailyCostByService.Sort(10)
  return {dailyCostByService}  
}
