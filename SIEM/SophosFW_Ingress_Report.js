function sophos_source(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@eventType","Sophos")
    let source = f("@source")
    let size = f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by source
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function sophos_field(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}" } sContent("@eventType","Sophos")
    let {{.field}} = f("@sophos.{{.field}}")
    let size = f("__size__")
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

function main({from = "-24h<h", to = "@h"}) {
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let topSizeBySource = sophos_source(env.from, env.to)
  let topSizeByAction = sophos_field(env.from, env.to, "action")
  let topSizeBySub = sophos_field(env.from, env.to, "sub")
  let top10SizeBySource = topSizeBySource.Clone().Sort(10, "-totalSize")
  let top10SizeByAction = topSizeByAction.Clone().Sort(10, "-totalSize")
  let top10SizeBySub = topSizeBySub.Clone().Sort(10, "-totalSize")
  let totalSize = top10SizeBySub.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    topSizeBySource,
    topSizeByAction,
    topSizeBySub,
    top10SizeBySource,
    top10SizeByAction,
    top10SizeBySub,
    totalSize
  }
}