
// check in last one hour in 5 minutes interval
function queueAlerts(queues) {
  let options = {from: "-1h@h", to: "@h", dimensions: ["QueueName"], namespace: "AWS/SQS", period: "5m", stat: "Maximum", unit:"Second"}
  let filters = {QueueName: queues}
  let ages = AWS_GetMetric("ApproximateAgeOfOldestMessage", options, filters)
  
  // alert when oldest message is over 1 hour in 2 time slots. (2 over 2 slots)
  let ageAlerts = alert(ages, window(ages > 3600, 2, 2))
  
  options.stat = "Sum"
  options.unit = "Count"
  let received = AWS_GetMetric("NumberOfMessagesReceived", options, filters)

  options.stat = "Average"
  let queueLength = AWS_GetMetric("ApproximateNumberOfMessagesVisible", options, filters)
  
  // alert when the queue is not empty while the received is 0. for at least 2 slots ( 2 over 2, ie. 10 minutes sliding window)
  let consumerStopAlerts = alert([queueLength,received], window(received == 0 && queueLength > 1, 2, 2))

  return {ageAlerts, consumerStopAlerts}
}


/*
 *  this report alert if one SQS queue consumer stopped receiving, or one queue has backlog
*/
function main() {
   let {ageAlerts, consumerStopAlerts} =  AWS_AccountRegionLambda("*", "*", () => {
      let queues = AWS_LoadAsset("sqs:queue", (obj) => {
         let QueueUrl = obj.QueueUrl
         let segments = split(QueueUrl, "/")
         let ID = segments[len(segments)-1]
         return { ID }
      })
      let {ageAlerts, consumerStopAlerts} =  queueAlerts(queues)
      return {ageAlerts, consumerStopAlerts}
   })
 
   // send alert to incident management
   consumerStopAlerts.Emit("QueueConsumerStopped", "SQS queue consumer stopped" , "error", 7200)
   ageAlerts.Emit("QueueBacklog", "SQS queue backlog" , "error", 7200)
   // queues.Sort(100, "Backlog")
   return {ageAlerts, consumerStopAlerts}    
   
}


