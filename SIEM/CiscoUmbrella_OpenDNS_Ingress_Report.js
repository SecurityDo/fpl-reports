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

function main() {
  setEnv("from", "-24h<h")
  setEnv("to", "-1h>h")
  let totalSizeByType = opendnsByField("-24h<h", "-1h>h", "queryType")
  let totalSize = totalSizeByType.GroupBy(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })
  let topSizeByType = totalSizeByType.Clone().Sort(10, "-totalSize")

  let totalSizeByCode = opendnsByField("-24h<h", "-1h>h", "responseCode")
  let topSizeByCode = totalSizeByCode.Clone().Sort(10, "-totalSize")

  let totalSizeByPIT = opendnsByField("-24h<h", "-1h>h", "policyIdentityType")
  let topSizeByPIT = totalSizeByPIT.Clone().Sort(10, "-totalSize")

  let totalSizeByAction = opendnsByField("-24h<h", "-1h>h", "action")
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
