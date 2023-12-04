// Description:
// Syslog (Event/Traffic logs) from FortiGate NG Firewalls

// {
//  "@message": "date=2023-07-17 time=11:13:00 devname=\"ABCD\" devid=\"FGT401234567AB\" dstcountry=\"United States\"",
//  "@facility": "local7"
// }

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    // Event selection criteria
    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }

    if (!startsWith(msg, "time=")){
        return {"status":"abort"}
    }
    let tags = obj["@tags"]
    if (!tags) {
        return {"status":"abort"}
    }
    if (!tags.Some( (_, tag) => startsWith(tag, "date=" ))) {
       return {"status":"abort"}
    }

    // Output field settings
    obj["@type"] = "event"

    obj["@parser"] = "fpl-FortigateFWSyslog"
    obj["@parserVersion"] = "20231129-5"
    obj["@event_type"]="fortigate"
    obj["@eventType"]="FortiGateNGFW"

    // Event parsing
    let m = mergeTagWithMessage(obj)
    let f = decoder_MixedKeyValue(m)

    obj["@fortigate"] = f
    tags = ["fortigate"]
    obj["@tags"] = tags

    // Discard original message
    // obj["@message"] = ""

    // Collect device metrics
    recordDeviceMetrics(obj, size)

    // Metaflow, data normalization
    generateFusionEventWithCache(obj)

    return {"status":"pass"}
}

function generateFusionEventWithCache(obj) {
    let f = obj["@fortigate"]

    if (!(f.srcip && f.dstip && f.srcport && f.dstport && f.proto)) {
        // printf("invalid event record for flow: %v", f)
        return
    }

    let ts = obj["@timestamp"]

    // if (f.logid == "0000000020"){}
    // https://community.fortinet.com/t5/FortiGate/Technical-Tip-Notes-on-Traffic-log-generation-and-logging/ta-p/189711
    // https://docs.fortinet.com/document/fortianalyzer/7.4.1/administration-guide/750342/long-lived-session-handling

    let envelop = {
        partition: "default",
        dataType: "event",
        time_ms: ts
    }

    let sp = (f.srcport ? parseInt(f.srcport) : 0)
    let dp = (f.dstport ? parseInt(f.dstport) : 0)
    let prot = (f.proto ? parseInt(f.proto) : 0)

    let dur_E = (f.duration ? parseInt(f.duration) : 0)
    let sentP_E = (f.sentpkt ? parseInt(f.sentpkt) : 0)
    let rcvdP_E = (f.rcvdpkt ? parseInt(f.rcvdpkt) : 0)
    let sentB_E = (f.sentbyte ? parseInt(f.sentbyte) : 0)
    let rcvdB_E = (f.rcvdbyte ? parseInt(f.rcvdbyte) : 0)

    let dur = dur_E // default case
    let sentP = sentP_E
    let rcvdP = rcvdP_E
    let sentB = sentB_E
    let rcvdB = rcvdB_E

    // cache logic only when 'delta' fields exist
    if (f.sentdelta && f.devid) {
        let devid = f.devid

        let cacheName = sprintf("fg-session-%s" + devid)
        let flag = Platform_Cache_Check(cacheName)
        if (!flag) {
            let ok = Platform_Cache_Register(cacheName, {expire: 600})
        }

        let key = f.sessionid
        // https://community.fortinet.com/t5/FortiGate/Technical-Tip-Multiple-sessions-are-assigned-with-same-session/ta-p/196925
        if (f.proto == "6" || f.proto == "17") {
            key = sprintf("%s_%s_%s_%s_%s_%s",f.sessionid, f.dstip, f.dstport, f.srcip, f.srcport, f.proto)
        }
        let record = Platform_Cache_Get(cacheName, key)

        if (record) {
            let {duration, sentpkt, rcvdpkt, sentbyte, rcvdbyte} = record
            if (dur_E - duration < 0) {
                // debug
                obj["@debug"] = sprintf("session out of order: %s" + key)
            }
            dur = dur_E - duration > 0 ? dur_E - duration : 0
            sentP = sentP_E - sentpkt > 0 ? sentP_E - sentpkt : 0
            rcvdP = rcvdP_E - rcvdpkt > 0 ? rcvdP_E - rcvdpkt : 0
            sentB = sentB_E - sentbyte > 0 ? sentB_E - sentbyte : 0
            rcvdB = rcvdB - rcvdbyte > 0 ? rcvdB - rcvdbyte : 0
        }

        // update cache
        Platform_Cache_Set(cacheName, key, {
            duration: dur_E,
            sentpkt: sentP_E,
            rcvdpkt: rcvdP_E,
            sentbyte: sentB_E,
            rcvdbyte: rcvdB_E,
        })
        // use sentdelta/rcvddelta, if possible
        // let sentB = (f.sentdelta ? parseInt(f.sentdelta) : (f.sentbyte ? parseInt(f.sentbyte) : 0))
        // let rcvdB = (f.rcvddelta ? parseInt(f.rcvddelta) : (f.rcvdbyte ? parseInt(f.rcvdbyte) : 0))
    }

    let source={
        flow: {
            sip: f.srcip,
            dip: f.dstip,
            sp: sp,
            dp: dp,
            prot: prot,

            rxB: rcvdB,
            txB: sentB,
            totalB: sentB + rcvdB,
            rxP: rcvdP,
            txP: sentP,

            dur: dur,
            time_ms: ts
        },
        dtype:"fortigate"
    }
    obj["@metaflow"] = source
    //printf("%v",source)
    Fluency_FusionEvent(envelop, source)
}

function mergeTagWithMessage(obj) {
    let tags = obj["@tags"]
    if(tags){
        return tags[0] + " " + obj["@message"]
    }
    return obj["@message"]
}

function recordDeviceMetrics(obj, size) {
    let sender = obj["@sender"]
    let source = obj["@source"]
    let f = obj["@fortigate"]

    let deviceName = (f.devname ? f.devname : "unknown")

    let deviceEntry = Fluency_Device_LookupName(deviceName)
    if (!deviceEntry) {
        deviceEntry = {
            name:deviceName,
            ips: [sender],
            group:"FPL-detect: FortiGate NGFW",
            device: {
                name:"FortiGate NGFW",
                category:"Firewall"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"FortiGateNGFW",
        syslogSender:sender,
        customer: "default",
        importSource: deviceEntry.name,
        deviceType: deviceEntry.device.name
    }
    if deviceEntry.group {
        dimensions.group = deviceEntry.group
    }
    Platform_Metric_Counter("fluency_import_count", dimensions, 1)
    Platform_Metric_Counter("fluency_import_bytes", dimensions, size)
}
