// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    let logEvents = obj.logEvents
    if !logEvents {
       throw "no logEvents field"
    }
    let list = []
    for i, logEvent = range logEvents {
      logEvent.logStream = obj.logStream
      logEvent.logGroup = obj.logGroup
      logEvent.owner = obj.owner
      logEvent.subscriptionFilters = obj.subscriptionFilters      
      list = append(list, logEvent)
    }
    return list
}
