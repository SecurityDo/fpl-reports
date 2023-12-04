// Description:
// Logs from ESET Server on Windows

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {

    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }
    
    let tags = obj["@tags"]
    if (!tags) {
        return "abort"
    } 
    if (!tags.Some( (_, tag) => content(tag, "1" ))) {
       return "abort"
    }

    obj["@type"] = "event"

    obj["@parser"] = "fpl-ESETServerLog"
    obj["@parserVersion"] = "20231101-1"
    
    // Note: string contains un-printable character"- - (U+FEFF){"
    let start = indexOf(msg, "- - ﻿{")
    let data = subString(msg, start+5, len(msg))
    let f = parseJson(data)
    
    obj["@event_type"]="eset"
    obj["@eventType"]="ESETServer"
    obj["@eset"] = f
    
    esetFieldAdjustments(f)

    // device name
    let deviceName = "unknown"

    let sp = split(msg, " ")
    if (len(sp) > 2) {
        tags = []
        deviceName = replaceAll(sp[2], " ", "_", -1)
        tags = append(tags, deviceName)
        obj["@tags"] = tags
    }

    recordDeviceMetrics(obj, size, deviceName)

    return {"status":"pass"}
}

function esetFieldAdjustments(doc) {
    return doc
}

function recordDeviceMetrics(obj, size, deviceName) {
    let sender = obj["@sender"]
    let source = obj["@source"]

    let deviceEntry = Fluency_Device_LookupName(deviceName)
    if (!deviceEntry) {
        deviceEntry = {
            name:deviceName,
            ips: [sender],
            group:"FPL-detect: ESET Mgmt Server",
            device: {
                name:"ESET",
                category:"Endpoint"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"ESETServer",
        syslogSender:sender,
        // syslogDevice:deviceEntry.name,
        customer: "default",
        importSource: deviceEntry.name,
        deviceType: deviceEntry.device.name
    }
    if deviceEntry.group {
        dimensions.group = deviceEntry.group
    }
    Platform_Metric_Counter("fluency_import_count", dimensions,1)
    Platform_Metric_Counter("fluency_import_bytes", dimensions,size)
}
