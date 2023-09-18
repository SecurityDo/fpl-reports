function eventSizeBySource(from, to) {
  let env = {from: from, to: to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      assign source=f("@source"), size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by source
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function eventSizeBySender(from, to) {
  let env = {from: from, to: to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      assign sender=f("@sender"), size=f("__size__")
      aggregate totalSize=sum(size), eventCount=count() by sender
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function eventSizeByEventType(from, to) {
  let env = {from: from, to: to}
  let fplTemplate = `
      search {from="{{.from}}", to="{{.to}}"}
      assign eventType=f("@eventType"), event_type=f("@event_type"), size=f("__size__")
      let eventtype = coalesce(eventType, event_type)
      aggregate totalSize=sum(size), eventCount=count() by eventtype
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return table
}

function main() {
  let statsBySource1 = eventSizeBySource("-30d<d", "-25d>d")
  let statsBySource2 = eventSizeBySource("-25d<d", "-20d>d")
  let statsBySource3 = eventSizeBySource("-20d<d", "-15d>d")
  let statsBySource4 = eventSizeBySource("-15d<d", "-10d>d")
  let statsBySource5 = eventSizeBySource("-10d<d", "-5d>d")
  let statsBySource6 = eventSizeBySource("-5d<d", "-1d>d")
  let statsBySource = mergeTable(statsBySource1, statsBySource2, statsBySource3, statsBySource4, statsBySource5, statsBySource6).Aggregate(({source, totalSize, eventCount})=>{
      return {groupBy: {source}, columns: {sum: {totalSize: totalSize}, sum: {totalEventCount: eventCount}}}
  })

  let statsBySender1 = eventSizeBySender("-30d<d", "-25d>d")
  let statsBySender2 = eventSizeBySender("-25d<d", "-20d>d")
  let statsBySender3 = eventSizeBySender("-20d<d", "-15d>d")
  let statsBySender4 = eventSizeBySender("-15d<d", "-10d>d")
  let statsBySender5 = eventSizeBySender("-10d<d", "-5d>d")
  let statsBySender6 = eventSizeBySender("-5d<d", "-1d>d")
  let statsBySender = mergeTable(statsBySender1, statsBySender2, statsBySender3, statsBySender4, statsBySender5, statsBySender6).Aggregate(({sender, totalSize, eventCount})=>{
      return {groupBy: {sender}, columns: {sum: {totalSize: totalSize}, sum: {totalEventCount: eventCount}}}
  })

  let statsByEventType1 = eventSizeByEventType("-30d<d", "-25d>d")
  let statsByEventType2 = eventSizeByEventType("-25d<d", "-20d>d")
  let statsByEventType3 = eventSizeByEventType("-20d<d", "-15d>d")
  let statsByEventType4 = eventSizeByEventType("-15d<d", "-10d>d")
  let statsByEventType5 = eventSizeByEventType("-10d<d", "-5d>d")
  let statsByEventType6 = eventSizeByEventType("-5d<d", "-1d>d")
  let statsByEventType = mergeTable(statsByEventType1, statsByEventType2, statsByEventType3, statsByEventType4, statsByEventType5, statsByEventType6).Aggregate(({eventtype, totalSize, eventCount})=>{
      return {groupBy: {eventtype}, columns: {sum: {totalSize: totalSize}, sum: {totalEventCount: eventCount}}}
  })

  let totalStats = statsByEventType.Aggregate(({totalSize})=>{
      return {columns:{ sum: {totalIngressSize: totalSize}, count: {totalEventTypes: true}}}
  })

  let totalStatsBySender = statsBySender.GroupBy(({totalSize, eventCount})=>{
      return {columns:{ sum: {totalIngressSize: totalSize}, sum: {totalEventCount: eventCount}}}
  })
  totalStatsBySender.NewColumnLambda("totalEPS", "", (row)=>row.totalEventCount / 2592000)
  totalStatsBySender.NewColumnLambda("totalEPH", "", (row)=>row.totalEventCount / 720)

  let topSizeBySource = statsBySource.Clone().Sort(10, "totalSize")
  let topSizeBySender = statsBySender.Clone().Sort(10, "totalSize")
  let topSizeByEventType = statsByEventType.Clone().Sort(10, "totalSize")

  return {statsBySource, statsBySender, statsByEventType, totalStats, totalStatsBySender, topSizeBySource, topSizeBySender, topSizeByEventType}
}