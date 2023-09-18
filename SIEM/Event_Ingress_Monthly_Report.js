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

function main({from = "-30d<d", to = "-1d>d", interval= "5d"}) {
  let rangeFrom = new Time(from)
  let rangeTo = new Time(to)
  let statsBySource = new Table()
  let statsBySender = new Table()
  let statsByEventType = new Table()
  for let t = rangeFrom; t.Before(rangeTo); t = t.Add(interval) {
    statsBySource.Append(eventSizeBySource(t, t.Add(interval)))
    statsBySender.Append(eventSizeBySender(t, t.Add(interval)))
    statsByEventType.Append(eventSizeByEventType(t, t.Add(interval)))
  }

  statsBySource = statsBySource.Aggregate(({source, totalSize, eventCount})=>{
      return {groupBy: {source}, columns: {sum: {totalSize: totalSize}, sum: {eventCount}}}
  })

  statsBySender = statsBySender.Aggregate(({sender, totalSize, eventCount})=>{
      return {groupBy: {sender}, columns: {sum: {totalSize: totalSize}, sum: {eventCount}}}
  })

  statsByEventType = statsByEventType.Aggregate(({eventtype, totalSize, eventCount})=>{
      return {groupBy: {eventtype}, columns: {sum: {totalSize: totalSize}, sum: {eventCount}}}
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