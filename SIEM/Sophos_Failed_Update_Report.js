function getData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@sophos.type","Event::Endpoint::UpdateFailure")
    let timestamp=f("@timestamp")
    let Time=strftime("%a, %d %b %Y %T %z",timestamp)
    let {MachineName="dhost"} = f("@sophos")
    let {IPAddress="ip"} = f("@sophos.source_info")
    sort Time
    table Time, MachineName, IPAddress
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function getTimeData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@sophos.type","Event::Endpoint::UpdateFailure")
    let timestamp=f("@timestamp")
    let Failures="Failures"
    timechart {span="1d"} count=count() by Failures
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from=`-7d<d`, to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let TotalFailedUpdates = getData(env)
  let FailureCount = TotalFailedUpdates.Aggregate(() => {
    return {
      columns: {
        count: {TotalCount: true}
      }
    }
  })
  let TopCountByMachineName = TotalFailedUpdates.Aggregate(({MachineName}) => {
    return {
      groupBy: {MachineName},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let TopCountByIPAddress = TotalFailedUpdates.Aggregate(({IPAddress}) => {
    return {
      groupBy: {IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let AllCountByMachineNameAndIPAddress = TotalFailedUpdates.Aggregate(({MachineName, IPAddress}) => {
    return {
      groupBy: {MachineName, IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(0, "-Count")
  let TimeChart = getTimeData(env)

  return {TotalFailedUpdates, FailureCount, TopCountByMachineName, TopCountByIPAddress, AllCountByMachineNameAndIPAddress, TimeChart}
}