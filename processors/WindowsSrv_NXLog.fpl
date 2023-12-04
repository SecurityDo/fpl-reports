// Description:
// Selects / parses Windows NXLog records w/ (merge_tag_colon_with_message)

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    // Replacement for Java (Groovy) parser
    let tags = obj["@tags"]
    if (!tags) {
        return "abort"
    }
    if (tags.Some((_, tag) =>  (tag !=`{"EventTime"` && tag !=`{"EventReceivedTime"`))) {
       return "abort"
    }
    
    let m = merge_tag_colon_with_message(obj)
    // printf("%s",m)
    if (startsWith(m,"{")) {
        // printf("no debug")
        try {
            let o = parseJson(m)
            processJSON(obj,o)
        } catch (e) {
            obj["@parserError"] = sprintf("(%s) - %s", e.name, e.message)
            return "abort"
        }
    } else {
        // return {"status":"reject","msg":"invalid json message (no '{')"}
        obj["@parserError"] = "Invalid JSON message (no '{')"
        // printf("debug")
        // printf("%s",m)
        return "abort"
    }
    
    obj["@type"] = "event"
    obj["@parser"] = "fpl-WindowsNXLog"
    obj["@parserVersion"] = "20231113-1"
    
    // device name
    let f = obj["@fields"]
    let deviceName = (f.Hostname ? f.Hostname : "unknown")
    recordDeviceMetrics(obj, size, deviceName)

    //recordEventMetrics(obj, size)

    return "pass"
}

function processJSON(obj, o) {
    if (!o) {
        obj["@tags"] = ["_jsonParseError"]
        // return {"status":"reject","msg":"no fields obj"}
        obj["@parserError"] = "No object after parseJson()"
        return "abort"
    }

    if (o.Message) {
        obj["@message"] = o.Message
        delete(o, "Message")
    } else {
        // return {"status":"reject","msg":"no message in obj"}
        obj["@parserError"] = "No Message in JSON object"
        return "abort"
    }
    
    if (o.LogonProcessName) {
        o.LogonProcessName = trimSpace(o.LogonProcessName)
    }

    // obj["@tags"] = ["WindowsNXLog"]

    if (o.SourceModuleName && o.SourceModuleName=="dhcp_in") {
        //printf("dhcp nested")
        let segments = split(obj["@message"],",")
        //printf("%v",len(segments))
        if (len(segments) < 7) {
            // return {"status":"reject","msg":"dhcp msg too short"}
            obj["@parserError"] = "DHCP message too short"
            return "abort"
        }
        o.Type = segments[3]
        o.ClientIp = segments[4]
        o.Hostname = segments[5]
        o.ClientMac = segments[6]
        o.EventType = segments[0]
        obj["@tags"] = ["windows-dhcp"]
        obj["@eventType"] = "nxlogDHCP"
    }
    
    if (o.SourceModuleName && o.SourceModuleType=="im_msvistalog") {
        if (o.EventType) {
            // set tags to eventType
            obj["@tags"] = [o.EventType]
        }
        obj["@eventType"] = "nxlogAD"
    }

    if (o.TargetUserName && o.TargetDomainName){
        o._TargetFullName_ = o.TargetUserName + "\\" + o.TargetDomainName
    }
    if (o.SubjectUserName && o.SubjectDomainName){
        o._SubjectFullName_ = o.SubjectUserName + "\\" + o.SubjectDomainName
    }
    obj["@fields"] = o
}

function merge_tag_colon_with_message(obj) {
    let tags = obj["@tags"]
    if(tags){
        return tags[0] + ":" + obj["@message"]
    }
    return obj["@message"]
}

function recordDeviceMetrics(obj, size, deviceName) {
    let sender = obj["@sender"]
    let source = obj["@source"]

    let deviceEntry = Fluency_Device_LookupName(deviceName)
    if (!deviceEntry) {
        deviceEntry = {
            name:deviceName,
            ips: [sender],
            group:"FPL-detect: Windows Application Server",
            device: {
                name:"Windows Application Server",
                category:"Application Server"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"WindowsNXLog",
        syslogSender:sender,
        // syslogDevice:deviceEntry.name,
        customer: "default",
        importSource: deviceEntry.name,
        deviceType: deviceEntry.device.name
    }
    if (deviceEntry.group) {
        dimensions.group = deviceEntry.group
    }
    Platform_Metric_Counter("fluency_import_count", dimensions,1)
    Platform_Metric_Counter("fluency_import_bytes", dimensions,size)
}
/*
function recordEventMetrics(obj, size) {
    let f = obj["@fields"]

    let dimensions = {
        EventID: f.EventID,
        Hostname: f.Hostname,
        Channel: f.Channel,
        Category: f.Category,
        // SubjectFullName: f._SubjectFullName_,
        // TargetFullName: f._TargetFullName_,
        SourceName: f.SourceName
    }

    Platform_Metric_Counter("WindowsNXLog_count", dimensions,1)
    Platform_Metric_Counter("WindowsNXLog_bytes", dimensions,size)
}
*/
