// Description:
// Process events from CrowdStrike Falcon API integration

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    if(!obj["@timestamp"]){
        let t = new Time()
        obj["@timestamp"] = t.UnixMilli()
    }

    obj["@type"] = "event"
    obj["@parser"] = "fpl-CrowdStrikeFalconEvent"
    obj["@parserVersion"] = "20231109-1"
    obj["@eventType"] = "CSFalcon"
    if(obj["@event_type"] == "@falcon"){
        obj["@event_type"] = "falcon"
    }

    let envelop = obj["@falcon"]
    if (envelop) {
        let eventType = envelop.eventType
        // printf("%s",eventType)
        if eventType == "IncidentSummaryEvent" {
            let incidentID = envelop.event.IncidentID
            // printf("%s",incidentID)
            let segments = split(source, ":")
            printf("account: %s",segments[1])
            let {incident} = Platform_PluginLambda("Falcon", segments[1], (customer) => {
                let incident = Plugin_Falcon_GetIncident(incidentID)
                if incident {
                    // envelop.incident = incident
                    // printf("%s", incident)
                    return {incident}
                } else {
                    printf("unknown incidentID: %s", incidentID)
                    return {}
                }
            })
            if incident {
                envelop.incident = incident
            }
       }
    }

    return "pass"
}
