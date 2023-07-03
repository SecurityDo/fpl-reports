function getQueueMetrics(queues) {
  let options = {from:"-30d@h", to:"@h", dimensions: ["QueueName"], namespace: "AWS/SQS", period: "1h", stat: "Sum", unit:"Count"}
  let filters = {QueueName: queues}
  let sent = AWS_GetMetric("NumberOfMessagesSent", options, filters)
  return {sent} 
}

/*
 *  this report detect the SQS producer anomaly
 */
function main() {
   let {queueAlerts} =  AWS_AccountRegionLambda("FluencySIEM", "us-east-1", () => {
      let queues = AWS_LoadAsset("sqs:queue", (obj) => {
         let QueueUrl = obj.QueueUrl
         let segments = split(QueueUrl, "/")
         let ID = segments[len(segments)-1]
         return { ID }
      })
      // the generic anomaly load 30 day hourly history
      let {sent} =  getQueueMetrics(queues)
      
      // minimum differce to be at least 20 
      // minimun percent different to be at least 10%
      let queueAlerts = anomaly(sent, "QueueSentAnomaly", "adaptive anomaly detection", {seasonal: "auto", minDiff: 20, minDiffPercent: 10.0})
      return {queueAlerts}
   })
   
   queueAlerts.Limit(10)
   return {queueAlerts}    
   
}

