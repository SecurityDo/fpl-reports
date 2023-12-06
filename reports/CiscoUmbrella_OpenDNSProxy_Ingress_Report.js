function openProxyBy(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@opendnsProxy")
    let {{.field}}=f("@opendnsProxy.{{.field}}")
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
  let topSizeByVerdict = openProxyBy(from, to, "verdict")
  let topSizeByRequestMethod = openProxyBy(from, to, "requestMethod")
  let topSizeByPIT = openProxyBy(from, to, "policyIdentityType")
  let top10SizeByVerdict = topSizeByVerdict.Clone().Sort(10, "-totalSize")
  let top10SizeByRequestMethod = topSizeByRequestMethod.Clone().Sort(10, "-totalSize")
  let top10SizeByPIT = topSizeByPIT.Clone().Sort(10, "-totalSize")
  let totalSize = topSizeByRequestMethod.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    topSizeByVerdict,
    topSizeByRequestMethod,
    topSizeByPIT,
    top10SizeByVerdict,
    top10SizeByRequestMethod,
    top10SizeByPIT,
    totalSize
  }
}