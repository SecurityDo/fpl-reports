function opendnsByType(env) {
  let fplTemplate = `
    search %s
    let {queryType,responseCode,policyIdentityType,action}=f("@opendns")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by queryType
  `
  let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
  return table
}

function opendnsByCode(env) {
  let fplTemplate = `
    search %s
    let {queryType,responseCode,policyIdentityType,action}=f("@opendns")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by responseCode
  `
  let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
  return table
}

function opendnsByPIT(env) {
  let fplTemplate = `
    search %s
    let {queryType,responseCode,policyIdentityType,action}=f("@opendns")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by policyIdentityType
  `
  let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
  return table
}

function opendnsByAction(env) {
  let fplTemplate = `
    search %s
    let {queryType,responseCode,policyIdentityType,action}=f("@opendns")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by action
  `
  let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
  return table
}

function main() {
  let env = `{from="-24h<h", to="-1h>h"}`

  let totalSizeByType = opendnsByType(env)
  let totalSize = totalSizeByType.GroupBy(({totalSize}) => {
    return {columns: { sum: {totalSize} }}
  })
  let topSizeByType = totalSizeByType.Clone().Sort(10, "-totalSize")

  let totalSizeByCode = opendnsByCode(env)
  let topSizeByCode = totalSizeByCode.Clone().Sort(10, "-totalSize")

  let totalSizeByPIT = opendnsByPIT(env)
  let topSizeByPIT = totalSizeByPIT.Clone().Sort(10, "-totalSize")

  let totalSizeByAction = opendnsByAction(env)
  let topSizeByAction = totalSizeByAction.Clone().Sort(10, "-totalSize")

  return {totalSizeByType, totalSize, topSizeByType, totalSizeByCode, topSizeByCode, totalSizeByPIT, topSizeByPIT, totalSizeByAction, topSizeByAction}
}
