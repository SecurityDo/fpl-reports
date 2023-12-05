function getData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@fields.xml.EPOEvent.SoftwareInfo.Event.EventID","1119")
    let timestamp=f("@timestamp")
    let Time=strftime("%a, %d %b %Y %T %z",timestamp)
    let {MachineName,IPAddress} = f("@fields.xml.EPOEvent.MachineInfo")
    sort Time
    table Time, MachineName, IPAddress
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
} 

function getTimeData(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@fields.xml.EPOEvent.SoftwareInfo.Event.EventID","1119")
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

function main({from="-7d@d", to="@d"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let totalFailedData = getData(env)
  let failureCount = totalFailedData.Aggregate(() => {
    return {
      columns: {
        count: {TotalCount: true}
      }
    }
  })
  let topFailureCountByMachineName = totalFailedData.Aggregate(({MachineName}) => {
    return {
      groupBy: {MachineName},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let topFailureCountByIPAddress = totalFailedData.Aggregate(({IPAddress}) => {
    return {
      groupBy: {IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  }).Sort(10, "-Count")
  let failureCountByMachineNameAndIPAddress = totalFailedData.Aggregate(({MachineName, IPAddress}) => {
    return {
      groupBy: {MachineName, IPAddress},
      columns: {
        count: {Count: true}
      }
    }
  })
  let timeChart = getTimeData(env)
  return {totalFailedData, failureCount, topFailureCountByMachineName, topFailureCountByIPAddress, failureCountByMachineNameAndIPAddress, timeChart}
}