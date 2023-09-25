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

function main() {
  let topSizeBysn = sonicwall_by("-24h<h", "@h", "sn")
  let topSizeByfw_action = sonicwall_by("-24h<h", "@h", "fw_action")
  let topSizeByc = sonicwall_c("-24h<h", "@h")
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
  return {topSizeBysn, topSizeByfw_action, topSizeByc, top10SizeBysn, top10SizeByfw_action, top10SizeByc, totalSize}
}