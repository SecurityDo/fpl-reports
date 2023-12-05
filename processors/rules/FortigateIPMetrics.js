/**
 * @file FortigateIPMetrics
 * @ruleoverview Adds the event data specified in the dimensions to the PromQL database according to the
 * metric type specified which is the field of the metric. The metric fields used for this rule are:
 *  - fortigate_ip_count (event count)
 *  - fortigate_ip_dur (event duration)
 *  - foritgate_ip_bytes (event bytes)
 * The conditions for this rule are that the action must not be deny and the event must have a metaflow field.
 */

/**
 * Main method. This method uses the Platform_Metric_Counter function to add the event data to the metric
 * and add it's corresponding value to the running metric total. 
 * 
 * @param {object} obj - The JSON object containing the event data
 *  
 * @returns {string} - Returns a string indicating the status of the action where
 *  pass indicates that the event was added
 *  abort indicates that the event was not added as it did not meet the conditions
 */
function main({obj}) {
  let {action, devname, srcip, srcname, dstip, user, group} = obj["@fortigate"]
  if (action == "deny") {
      return "abort"
  }
  let metaflow = obj["@metaflow"]
  if (!metaflow) {
     return "abort"
  }
  let {rxB, txB, dur} = metaflow.flow
  let ip_dimensions = {
      namespace: "fluency",
      customer: "default",
      // fields
      devname: devname,
      srcip: srcip,
      srcname: srcname,
      dstip: dstip,
      user: user,
      group: group
  }
  // add the event and count by 1
  Platform_Metric_Counter("fortigate_ip_count", ip_dimensions, 1)
  // add the duration of the event if present
  if (dur) {
      Platform_Metric_Counter("fortigate_ip_dur", ip_dimensions, dur)
  }
  // add the total received bytes if present
  if (rxB){
      ip_dimensions.direction = "received"
      Platform_Metric_Counter("fortigate_ip_bytes", ip_dimensions, rxB)
  }
  // add the total sent bytes if present     
  if (txB){
      ip_dimensions.direction = "sent"
      Platform_Metric_Counter("fortigate_ip_bytes", ip_dimensions, txB)
  }
  return "pass"
}