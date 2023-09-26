function cloudfunnelBy(from, to, field) {
  let env = {from, to, field}
  let fplTemplate = ""
  if (field == "type") {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@source", "cloudfunnel")
      let {{.field}}=f("@cloudfunnel.{{.field}}")
      let size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by {{.field}}
    `
  } else {
    fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"} sContent("@source", "cloudfunnel")
      let {{.field}}=f("@cloudfunnel.agent.{{.field}}")
      let size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by {{.field}}
    `
  }
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main() {
  let env = {from: "-24h<h", to: "@h"}
  setEnv("from", env.from)
  setEnv("to", env.to)
  let totalSizeByType = cloudfunnelBy(env.from, env.to, "type")
  let totalSizeBySiteName = cloudfunnelBy(env.from, env.to, "siteName")
  let totalSizeByGroupName = cloudfunnelBy(env.from, env.to, "groupName")
  let top10SizeByType = totalSizeByType.Clone().Sort(10, "-totalSize")
  let top10SizeBySiteName = totalSizeBySiteName.Clone().Sort(10, "-totalSize")
  let top10SizeByGroupName = totalSizeByGroupName.Clone().Sort(10, "-totalSize")
  let totalSize = totalSizeByType.Aggregate(({totalSize}) => {
    return {
      columns: {
        sum: {totalSize}
      }
    }
  })

  return {
    totalSizeByType,
    totalSizeBySiteName,
    totalSizeByGroupName,
    top10SizeByType,
    top10SizeBySiteName,
    top10SizeByGroupName,
    totalSize
  }
}