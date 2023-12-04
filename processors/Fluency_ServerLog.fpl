// Description:
// Syslog from Fluency Cloud server instances
// Default action: { status: "abort" }

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {

    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }

    obj["@type"] = "event"

    obj["@parser"] = "fpl-FluencyServerSyslog"
    obj["@parserVersion"] = "20231127-1"

    let tags = obj["@tags"]

    // Event drop criteria
    if (tags && tags.Some( (_, tag) =>  tag =="summary" )) {
        if (startsWith(msg, "doc")){
            return drop_SummaryDocSrcMissing(obj, size)
        }
    }

    if (tags && tags.Some( (_, tag) =>  tag =="fsm_service" )) {
        if (startsWith(msg, "check behavior signal behavior:")){
            return drop_FSMServiceDebug(obj, size)
        }
    }

    if (tags && tags.Some( (_, tag) =>  tag =="lava_service" )) {
        if (startsWith(msg, "Loop Received IPC ")){
            return drop_LavaLoopReceived(obj, size)
        }
    }

    if (tags && tags.Some( (_, tag) =>  tag =="loader_service" )) {
        //if (startsWith(msg, "doc")){
        //    return drop_LoaderDocSrcMissing(obj, size)
        //}
        if (contains(msg, "No space left on device")){
            return drop_LoaderDiskFull(obj, size)
        }
        if (contains(msg, "ce missing!")){
            return drop_LoaderDocSrcMissing(obj, size)
        }
    }

    if (tags && tags.Some( (_, tag) =>  tag =="histogram_service" )) {
        if (startsWith(msg, "repo entry count")){
            return drop_HistogramServiceDebug(obj, size)
        }
        if (startsWith(msg, "reject future time")){
            return drop_HistogramServiceDebug(obj, size)
        }
        if (startsWith(msg, "collected") && contains(msg, " memory blocks")){
            return drop_HistogramServiceDebug(obj, size)
        }
    }

    // Event selection criteria
    if (startsWith(msg, "[GIN]")){
        return gin(obj, size)
    }

    if (tags && tags.Some( (_, tag) =>  tag =="fsm_service" )) {
        return fsm_service(obj, size)
    }

    if (tags && tags.Some( (_, tag) =>  tag =="event_service" )) {
        return event_service(obj, size)
    }

    // Unknown event, default action
    return { status: "abort" }
}

function recordDeviceMetrics(obj, size, eventType) {
    let sender = obj["@sender"]
    let source = obj["@source"]

    let deviceEntry = Fluency_Device_Lookup(sender)
    if (!deviceEntry) {
        deviceEntry = {
            name:source,
            ips: [sender],
            group:"FPL-detect: Fluency Server",
            device: {
                name:"Fluency Server",
                category:"SIEM"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:eventType,
        syslogSender:sender,
        syslogDevice:deviceEntry.name,
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

function recordDroppedMetrics(obj, size, eventType) {
    // TODO
}

function drop_SummaryDocSrcMissing(obj, size) {
    // Fluency error print spike:
    // summary doc _source missing!

    //recordDropppedMetrics(obj, size)
    return { status: "drop" }
}

function drop_LoaderDiskFull(obj, size) {
    // Fluency error print spike: (loader_service)
    // Create GzipWriter Failed ... No space left on device

    //recordDropppedMetrics(obj, size)
    return { status: "drop" }
}

function drop_LoaderDocSrcMissing(obj, size) {
    // Fluency error print spike: (loader_service)
    // doc _source missing!

    //recordDropppedMetrics(obj, size)
    return { status: "drop" }
}

function drop_FSMServiceDebug(obj, size) {
    // Fluency debug print: (fsm_service)
    // check behavior signal behavior:

    //recordDropppedMetrics(obj, size)
    return { status: "drop" }
}

function drop_LavaLoopReceived(obj, size) {
    // Fluency debug print: (lava_service)
    // Loop Received IPC message.

    //recordDropppedMetrics(obj, size)
    return { status: "drop" }
}

function drop_HistogramServiceDebug(obj, size) {
    // Fluency debug print: (histogram_service)
    // repo entry count _
    // collected _ memory blocks

    //recordDropppedMetrics(obj, size)
    return { status: "drop" }
}

function gin(obj, size) {
    obj["@eventType"]="gin_server"

    let f = {}
    let msg = obj["@message"]
    let split_message = split(msg, "|")
    if (len(split_message) == 5) {
        f["status"] = trimSpace(split_message[1])
        f["client"] = trimSpace(split_message[3])
        f["method"] = getMethod(trimSpace(split_message[4]))
        f["path"] = getRes(trimSpace(split_message[4]))
    } else {
        f["error"] = "unable to split log record"
    }
    obj["@gin"] = f
    obj["@event_type"]="gin" // for interface display logic

    recordDeviceMetrics(obj, size, obj["@eventType"])
    return { status: "pass" }
}

function getMethod(msg) {
    let index = indexOf(msg, " ")
    if(index >-1){
        return subString(msg, 0, index)
    }
    return msg
}

function getRes(msg) {
    let index = indexOf(msg, `"`)
    if(index >-1){
        return subString(msg, index+1, len(msg)-1)
    }
    return msg
}

function fsm_service(obj, size) {
    obj["@eventType"]="fsm_service"
    // currently, do nothing for this type of event

    recordDeviceMetrics(obj, size, obj["@eventType"])
    return { status: "pass" }
}

function event_service(obj, size) {
    obj["@eventType"]="event_service"
    // currently, do nothing for this type of event

    recordDeviceMetrics(obj, size, obj["@eventType"])
    return { status: "pass" }
}
