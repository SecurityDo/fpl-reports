/**
 * @file Alert_Slack
 * @actionoverview Builds a slack message using the template and sends the message to the channel specified 
 * using the integration name specified in the configurations.
 */

/**
 * Main method. This methods builds the slack message template and calls the Platform_Notification_Slack function
 * to send the message to the channel using the integration specified. 
 * 
 * @param {object} event - The JSON object containing the event data
 * @param {object} config - The JSON object containing the configuration data
 * 
 * @returns {string} - Returns a string indicating the status of the action
 */
function main( {event, config={}} ) {

  let template = `
    {{define "tag"}}
    {{.key}} : *{{index .values 0}}*{{end}}
    Alert: *{{.name}}*
    Description: *{{.description}}*
    Severity: *{{.severity}}*
    Action: *{{.action}}*
    Source: *{{.source}}*
    {{ if ne .comment "" }}
    Comment: *{{.comment}}*
    {{end}} 
    Time: {{ .time }}
    Name: *{{.displayName}}*
    {{ if .account }}
    AWS Account: *{{.account}}*
    AWS AccountID: *{{.accountID}}*
    AWS Region: *{{.region}}*
    Dimension: *{{.dimension}}*
    Metric: *{{index .associatedMetric 0}}*
    {{end}}
    {{ if .tags }}
    Tags:
    {{range .tags}}{{ template "tag" . }}{{end}}{{end}}
  `
  let message = template(template, event)
  let integrationName = config.integrationName
  let options = {
    channel: config.channel,
    message,
  }
  Platform_Notification_Slack(integrationName, options)
  return "pass"
}
