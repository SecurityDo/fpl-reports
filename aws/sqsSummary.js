
// get queue metrics from the dimension table
function getQueueMetrics(queues) {
  let options = {from: "-1h@h", to: "@h", dimensions: ["QueueName"], namespace: "AWS/SQS", period: "1h", stat: "Average", unit:"Count"}
  let filters = {QueueName: queues}
  let backlogs = AWS_GetMetric("ApproximateNumberOfMessagesVisible", options, filters)
  options.from = "-24h@h"
  options.stat = "Sum"
  let sent = AWS_GetMetric("NumberOfMessagesSent", options, filters)
  let received = AWS_GetMetric("NumberOfMessagesReceived", options, filters)
  let size = AWS_GetMetric("SentMessageSize", options, filters)
  return {backlogs, sent, received, size} 
}


/*
 * This report list all SQS queues and sort them by backlog count
 *  
 */
function main() {
   let {queues} =  AWS_AccountRegionLambda("*", "*", () => {
      let queues = AWS_LoadAsset("sqs:queue", (obj) => {
         let QueueUrl = obj.QueueUrl
	 // queue name is part of the QueueUrl
         let segments = split(QueueUrl, "/")
         let ID = segments[len(segments)-1]
         let fifo = endsWith(ID, ".fifo")
         let tags = obj.Tags
         return { ID, fifo, tags }
      })
      let {backlogs, sent, received, size} =  getQueueMetrics(queues)

      // append stream summary as one table column
      queues.JoinStream(backlogs,"Last", "Backlog", "Count")
      queues.JoinStream(sent,"Sum", "Sent", "Count")
      queues.JoinStream(received,"Sum", "Received", "Count")
      queues.JoinStream(size,"Sum", "ReceivedSize", "Byte")
      return {queues}
   })
   
   // sort the asset table by one column
   queues.Sort(100, "Backlog")
   return {queues}    
   
}

