// Data input format: ({ obj, size, source }) or ( doc )
// cloudwatch event receiver for server logs
function main({obj, size, source, props}) {
    if obj.messageType != "DATA_MESSAGE" {
      return null
    }
    let list = []
    let logEvents = obj.logEvents
    if !logEvents {
       printf("logEvents field not found")
       return null
    }
    for i, event = range logEvents {
      let envelop = {
         logGroup: obj.logGroup,
         logStream: obj.logStream,
         subscriptionFilters: obj.subscriptionFilters,
         "@message": event.message,
         "@type": "event",
         "@timestamp": event.timestamp,
         "@source": obj.logStream
      }
      list = append(list, envelop)
    }
    return list
}

