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

function main() {
  setEnv("from", "-24h@h")
  setEnv("to", "@h")
  let topSizeByVerdict = openProxyBy("-24h@h", "@h", "verdict")
  let topSizeByRequestMethod = openProxyBy("-24h@h", "@h", "requestMethod")
  let topSizeByPIT = openProxyBy("-24h@h", "@h", "policyIdentityType")
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