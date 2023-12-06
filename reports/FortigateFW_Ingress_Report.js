function sizeByType(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
    assign type=f("@fortigate.type"), size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by type
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function sizeByDevName(env) {
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"}
    assign devname=f("@fortigate.devname"), size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by devname
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
  let env = {from, to}
  let typeStats = sizeByType(env)
  let devnameStats = sizeByDevName(env)
  let totalFortigateStats = devnameStats.Aggregate(({totalSize, devname}) => {
    return {
      columns: {
        sum: {totalIngressSize: totalSize},
        dcount: {totalDevname: devname}
      }
    }
  })
  let topFortigateSizeByType = typeStats.Clone().Sort(10, "-totalSize")
  let topFortigateSizeByDevname = devnameStats.Clone().Sort(10, "-totalSize")

  return {
    typeStats,
    devnameStats,
    totalFortigateStats,
    topFortigateSizeByType,
    topFortigateSizeByDevname
  }
}
