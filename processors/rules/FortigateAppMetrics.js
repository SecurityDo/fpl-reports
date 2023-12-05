/**
 * @file FortigateAppMetrics
 * @ruleoverview Adds the event data specified in the dimensions to the PromQL database according to the
 * metric type specified which is the field of the metric. The metric fields used for this rule are:
 *  - fortigate_app_count (event count)
 *  - fortigate_app_dur (event duration)
 *  - foritgate_app_bytes (event bytes)
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
  let {devname, app, appcat, hostname, action} = obj["@fortigate"]
  if (action == "deny") {
      return "abort"
  }
  let metaflow = obj["@metaflow"]
  if (!metaflow) {
     return "abort"
  }
  let {rxB, txB, dur} = metaflow.flow
  let app_dimensions = {
      namespace: "fluency",
      customer: "default",
      // fields
      devname: devname,
      hostname: hostname,
      app: app,
      appcat: appcat,
      action: action
  }
  // add the event and counter by 1
  Platform_Metric_Counter("fortigate_app_count", app_dimensions, 1)
  // add the event duration if present
  if (dur) {
      Platform_Metric_Counter("fortigate_app_dur", app_dimensions, dur)
  }
  // add the total received bytes of event if present
  if (rxB){
      app_dimensions.direction = "received"
      Platform_Metric_Counter("fortigate_app_bytes", app_dimensions, rxB)
  }
  // add the total sent bytes of event if present
  if (txB){
      app_dimensions.direction = "sent"
      Platform_Metric_Counter("fortigate_app_bytes", app_dimensions, txB)
  }
  return "pass"
}
