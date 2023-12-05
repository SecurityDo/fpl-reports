/**
 * @file FortigateEventMetrics
 * @ruleoverview Adds the event data specified in the dimensions to the PromQL database according to the
 * metric type specified which is the field of the metric. The metric fields used for this rule are:
 *  - fortigate_event_count (event count)
 *  - fortigate_event_dur (event duration)
 *  - foritgate_event_bytes (event bytes)
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
  let {level, type, subtype, devid, devname, srcip, dstcountry} = obj["@fortigate"]
  let event_dimensions = {
      namespace: "fluency",
      customer: "default",
      // fields
      level: level,
      type: type,
      subtype: subtype,
      devname: devname,
      devid: devid,
      srcip: srcip,
      dstcountry: dstcountry
  }
  Platform_Metric_Counter("fortigate_event_count", event_dimensions, 1)
  let metaflow = obj["@metaflow"]
  if (metaflow) {
      let {rxB, txB, dur} = metaflow.flow
      // add the event duration if present
      if (dur) {
          Platform_Metric_Counter("fortigate_event_dur", event_dimensions, dur)
      }
      // add the total received bytes of event if present
      if (rxB){
          event_dimensions.direction = "received"
          Platform_Metric_Counter("fortigate_event_bytes", event_dimensions, rxB)
      }
      // add the total sent bytes of event if present
      if (txB){
          event_dimensions.direction = "sent"
          Platform_Metric_Counter("fortigate_event_bytes", event_dimensions, txB)
      }
  }
  return "pass"
}
