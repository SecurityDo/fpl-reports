function sonicwall_by(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@sonicwall")
    let {{.field}}=f("@sonicwall.{{.field}}")
    let size=f("__size__")
    aggregate totalSize=sum(size), eventCount=count() by {{.field}}
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function sonicwall_c(from, to) {
  let env = {from, to}
  let fplTemplate = `
    search {from="{{.from}}", to="{{.to}}"} sContent("@event_type", "@sonicwall")
    let cid=f("@sonicwall.c")
    let size=f("__size__")
    let {Description} = entitylookup(cid, "Sonicwall_CategoryID")
    let c = condition(len(Description)>0, cid .. " - " .. Description, cid) 
    aggregate totalSize=sum(size), eventCount=count() by c
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

function main({from= "-24h<h", to= "@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  setEnv("from", from)
  setEnv("to", to)
  let env = {from, to}
  let topSizeBysn = sonicwall_by(env.from, env.to, "sn")
  let topSizeByfw_action = sonicwall_by(env.from, env.to, "fw_action")
  let topSizeByc = sonicwall_c(env.from, env.to)
  let top10SizeBysn = topSizeBysn.Clone().Sort(10, "-totalSize")
  let top10SizeByfw_action = topSizeByfw_action.Clone().Sort(10, "-totalSize")
  let top10SizeByc = topSizeByc.Clone().Sort(10, "-totalSize")
  let totalSize = topSizeBysn.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })
  return {
    topSizeBysn,
    topSizeByfw_action,
    topSizeByc,
    top10SizeBysn,
    top10SizeByfw_action,
    top10SizeByc,
    totalSize
  }
}