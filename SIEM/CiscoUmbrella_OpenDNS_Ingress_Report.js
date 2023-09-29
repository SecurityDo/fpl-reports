function opendnsByField(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
    let {queryType,responseCode,policyIdentityType,action}=f("@opendns")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by {{.field}}
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

function main({from="-24h<h", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let totalSizeByType = opendnsByField(from, to, "queryType")
  let totalSize = totalSizeByType.GroupBy(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })
  let topSizeByType = totalSizeByType.Clone().Sort(10, "-totalSize")

  let totalSizeByCode = opendnsByField(from, to, "responseCode")
  let topSizeByCode = totalSizeByCode.Clone().Sort(10, "-totalSize")

  let totalSizeByPIT = opendnsByField(from, to, "policyIdentityType")
  let topSizeByPIT = totalSizeByPIT.Clone().Sort(10, "-totalSize")

  let totalSizeByAction = opendnsByField(from, to, "action")
  let topSizeByAction = totalSizeByAction.Clone().Sort(10, "-totalSize")

  return {
    totalSizeByType,
    totalSize,
    topSizeByType,
    totalSizeByCode,
    topSizeByCode,
    totalSizeByPIT,
    topSizeByPIT,
    totalSizeByAction,
    topSizeByAction
  }
}
