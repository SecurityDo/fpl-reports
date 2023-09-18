function sizeByType(env) {
  let fplTemplate = `
    search %s
    assign type=f("@fortigate.type"), size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by type
  `
  let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
  return table
}

function sizeByDevName(env) {
  let fplTemplate = `
    search %s
    assign devname=f("@fortigate.devname"), size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by devname
  `
  let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
  return table
}

function main() {
  let env = `{from="-24h<h", to="-1h>h"}`

  let typeStats = sizeByType(env)
  let devnameStats = sizeByDevName(env)
  let totalFortigateStats = devnameStats.Aggregate(({totalSize, devname}) => {
    return {columns: { sum: {totalIngressSize: totalSize}, dcount: {totalDevname: devname} }}
  })
  let topFortigateSizeByType = typeStats.Clone().Sort(10, "-totalSize")
  let topFortigateSizeByDevname = devnameStats.Clone().Sort(10, "-totalSize")

  return {typeStats, devnameStats, totalFortigateStats, topFortigateSizeByType, topFortigateSizeByDevname}
}
