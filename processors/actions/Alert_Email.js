/**
 * @file Alert_Email
 * @actionoverview Builds an email subject and content email using the template and sends the emails 
 * to the recipients specified in the configurations. 
 */

/**
 * Main method. This methods builds the email template and calls the Platform_Notification_Email function
 * to send the email with the configurations. 
 * 
 * @param {object} event - The JSON object containing the event data
 * @param {object} config - The JSON object containing the configuration data
 * 
 * @returns {string} - Returns a string indicating the status of the action
 */
function main( {event, config={}} ) {

  let template = `
    {{define "tag"}}
    <li><p>{{.key}} : <b>{{ index .values 0 }}</b></p></li>{{end}}
    <p>Time: {{ .time }}</p>
    <p>Alert: <b>{{.name}}</b> ({{ .description }})</p>
    <p>Severity: <b>{{.severity}}</b></p>
    <p>Action: <b>{{.action}}</b></p>
    <p>Source: <b>{{.source}}</b></p>
    {{ if ne .comment "" }}
    <p>comment: <b>{{.comment}}</b></p>
    {{ end }}
    <p>Name: <b>{{.displayName}}</b></p>
    {{ if .account }}
    <p>Account: <b>{{.account}}</b></p>
    <p>AccountID: <b>{{.accountID}}</b></p>
    <p>Region: <b>{{.region}}</b></p>
    <p>Dimension: <b>{{.dimension}}</b></p>
    <p>Metric: <b>{{ index .associatedMetric 0 }}</b></p>
    {{end}}
    {{ if .tags }}
    <p>Tags:</p>
    <ul>{{range .tags}}{{ template "tag" . }}{{end}}</ul>
    {{end}}
    <p><a href="{{ .alertURL }}">Fluency Platform Alert</a></p>
  `
  let subjectTemplate = `Fluency Platform Alert: {{.name}} - {{ .action }}: {{.displayName}}`
  let html = htmlTemplate(template, event)
  let subject = template(subjectTemplate, event)

  let options = {
     to: config.to,
     cc: config.cc,
     subject,
     html
  }
  Platform_Notification_Email(options)
  return "pass"
}