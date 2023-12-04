function main({from="-24h@m", to="@m", interval="5m"}) {
  let totalEvents = getTotalEvents("fortigate_event_count", from, to, interval)
  let levels = getEventsByGroup("fortigate_event_count", from, to, interval, "level")
  let types = getEventsByGroup("fortigate_event_count", from, to, interval, "type")
  let subtypes = getEventsByGroup("fortigate_event_count", from, to, interval, "subtype")
  let topIP = getEventsByGroup("fortigate_event_count", from, to, interval, "srcip")
  let topDestCountry = getEventsByGroup("fortigate_event_count", from, to, interval, "dstcountry")

  return {
      totalEvents,
      levels,
      types,
      subtypes,
      topIP,
      topDestCountry
  }
}

function getTotalEvents(metric, from, to, interval) {
  let options = {
      metric: metric,
      from: from,
      to: to,
      interval: interval
  }
  let table = Platform_Metric_Sort(options)
  return table
}

function getEventsByGroup(metric, from, to, interval, field) {
  let options = {
      metric: metric,
      from: from,
      to: to,
      interval: interval,
      groupBy: field,
      sort: "topk",
      limit: 10
  }
  let table = Platform_Metric_Sort(options)
  return table
}
