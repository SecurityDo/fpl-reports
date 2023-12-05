// Description:
// Syslog from PaloAlto Networks Firewalls

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    // Event selection criteria
    let msg = obj["@message"]    
    if (!msg){
        return {"status":"abort"}
    }
    
    msg = mergeTagWithMessage(obj)

    if (!startsWith(msg,"1,20")){ //1,2023/11/26......
        return {"status":"abort"}
    }
    let start = indexOf(msg, "1,20")
    msg = subString(msg, start, len(msg))
    
    let sp = split(msg, ",")
    
    if (len(sp) < 5) { // too short
        return {"status":"abort"}
    }

    // Output field settings
    obj["@type"] = "event"

    obj["@parser"] = "fpl-PaloAltoFWSyslog"
    obj["@parserVersion"] = "20231127-4"
    obj["@event_type"]="paloalto"
    obj["@eventType"]="PaloAltoFW"

    // Event parsing
    // let m = mergeTagWithMessage(obj)
    // let f = decoder_MixedKeyValue(m)

    let action = ""
    action = sp[3]

    //let tags = obj["@tags"]
    //if (!tags) {
    //    tags = []
    //}
    
    let tags = []

    let f = {}
    if (action == "TRAFFIC"){
        f = processPATrafficLogs(sp)
        tags = append(tags, "PA_TRAFFIC")
    } elseif (action == "SYSTEM") {
        sp = splitLogs(msg) // re-split
        f = processPASystemLogs(sp)
        tags = append(tags, "PA_SYSTEM")
    } elseif (action == "THREAT") {
        sp = splitLogs(msg) // re-split
        f = processPAThreatLogs(sp)
        tags = append(tags, "PA_THREAT")
    } else {
        tags = append(tags, "PA")
    }


    obj["@paloalto"] = f
    obj["@tags"] = tags

    // Discard original message
    if (action == "TRAFFIC"){
        obj["@message"] = ""
    }

    // Adjustments
    // fieldAdjustments()
    
    // Collect device metrics
    let deviceName = (obj["@source"] ? obj["@source"] : "unknown")
    recordDeviceMetrics(obj, size, deviceName)

    // Metaflow, data normalization
    obj["@metaflow"] = generateFusionEvent(f, obj["@timestamp"])

    return {"status":"pass"}
}

function splitLogs(s) {
    let tokens = []
    let escape = false
    let token = ""
    for i, c = range s {
        if (c == ",") {
            if (!escape) {
                tokens = append(tokens, token)
                token = ""
                continue
            } else {
                token += c
            }
        } elseif (c == "\"") {
            if (!escape) {
                escape = true
                continue
            } else {
                escape = false
                continue
            }
        }
        token += c
    }
    
    if (token != ""){
        tokens = append(tokens, token)
    }
    return tokens
}

function processPATrafficLogs(split) {
    let f = {}
    if (len(split) < 54) {
        return f // too short
    }
    f._length = len(split)
    f.receive_time = split[1]
    f.serial = split[2]
    f.type = split[3]
    f.subtype = split[4]
    //split[5]
    f.time_generated = split[6]
    f.src = split[7]
    f.dst = split[8]
    f.natsrc = split[9]
    f.natdst = split[10]
    f.rule = split[11]
    f.srcuser = split[12]
    f.dstuser = split[13]
    f.app = split[14]
    f.vsys = split[15]
    f.from = split[16]
    f.to = split[17]
    f.inbound_if = split[18]
    f.outbound_if = split[19]
    f.logset = split[20]
    //split[21]
    f.sessionid = split[22]
    f.repeatcnt = split[23]
    f.sport = split[24]
    f.dport = split[25]
    f.natsport = split[26]
    f.natdport = split[27]
    f.flags = split[28]
    f.proto = split[29]
    f.action = split[30]
    f.bytes = split[31]
    f.bytes_sent = split[32]
    f.bytes_received = split[33]
    f.packets = split[34]
    f.start = split[35]
    f.elapsed = split[36]
    f.category = split[37]
    //split[38]
    f.seqno = split[39]
    f.actionflags = split[40]
    f.srcloc = split[41]
    f.dstloc = split[42]
    //split[43]
    f.pkts_sent = split[44]
    f.pkts_received = split[45]
    f.session_end_reason = split[46]
    f.dg_hier_level_1 = split[47]
    f.dg_hier_level_2 = split[48]
    f.dg_hier_level_3 = split[49]
    f.dg_hier_level_4 = split[50]
    f.vsys_name = split[51]
    f.device_name = split[52]
    f.action_source = split[53]

    return f
}

function processPASystemLogs(split) {
    let f = {}
    if (len(split) < 23) {
        return f // too short
    }
    f._length = len(split)
    f.receive_time = split[1]
    f.serial = split[2]
    f.type = split[3]
    f.subtype = split[4]
    //split[5]
    f.time_generated = split[6]
    f.vsys = split[7]
    f.eventid = split[8]
    f.object = split[9]
    //split[10]
    //split[11]
    f.module = split[12]
    f.severity = split[13]
    f.opaque = split[14]
    f.seqno = split[15]
    f.actionflags = split[16]
    f.dg_hier_level_1 = split[17]
    f.dg_hier_level_2 = split[18]
    f.dg_hier_level_3 = split[19]
    f.dg_hier_level_4 = split[20]
    f.vsys_name = split[21]
    f.device_name = split[22]

    return f
}

function processPAThreatLogs(split) {
    let f = {}
    if (len(split) < 78) {
        return f // too short
    }
    for i, val = range split {
        let s = sprintf("%d",i)
        let fn = threatFieldMapLookup(s)
        if (fn && fn != ""){
            f[fn] = val
        }else{
            if (val != "") { // remove "" values
                f[s] = val
            }
        }
    }

    return f
}

function generateFusionEvent(f,ts) {
    if (!(f.src && f.dst && f.sport && f.dport && f.proto)) {
        printf("invalid event record for flow: %v", f)
        return
    }

    let envelop={
        partition: "default",
        dataType: "event",
        time_ms: ts
    }
    let sp = f.sport ? parseInt(f.sport) : 0
    let dp = f.dport ? parseInt(f.dport) : 0
    let prot = parseProto(f.proto)

    let dur = (f.elapsed ? parseInt(f.elapsed) : 0) * 1000

    let sentB = f.bytes_sent ? parseInt(f.bytes_sent) : 0
    let rcvdB = f.bytes_received ? parseInt(f.bytes_received) : 0
    let sentP = f.pkts_sent ? parseInt(f.pkts_sent) : 0
    let rcvdP = f.pkts_received ? parseInt(f.pkts_received) : 0

    let source={
        flow: {
            sip: f.src,
            dip: f.dst,
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
        dtype:"patraffic"
    }

   // printf("%v",source)
   Fluency_FusionEvent(envelop, source)
   return source
}

function parseProto(proto) {
    if (startsWith(proto, "tcp")) {
        return 6
    } elseif (startsWith(proto, "udp")) {
        return 17
    } elseif (startsWith(proto, "icmp")) {
        return 1
    } elseif (startsWith(proto, "igmp")) {
        return 2
    } elseif (startsWith(proto, "icmpv6") || startsWith(proto, "icmp6")) {
        return 6
    }
    return 0
}

function mergeTagWithMessage(obj) {
    let tags = obj["@tags"]
    if(tags){
        return tags[0] + " " + obj["@message"]
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
            group:"FPL-detect: PaloAlto NGFW",
            device: {
                name:"PaloAlto FW",
                category:"Firewall"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"PaloAltoFW",
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

function threatFieldMapLookup(s){
    let fieldmap_THREAT = {
        "0" : "",
        "1" : "receive_time",
        "2" : "serial",
        "3" : "type",
        "4" : "subtype",
        "5" : "",
        "6" : "time_generated",
        "7" : "src",
        "8" : "dst",
        "9" : "natsrc",
        "10" : "natdst",
        "11" : "rule",
        "12" : "srcuser",
        "13" : "dstuser",
        "14" : "app",
        "15" : "vsys",
        "16" : "from",
        "17" : "to",
        "18" : "inbound_if",
        "19" : "outbound_if",
        "20" : "logset",
        "21" : "",
        "22" : "sessionid",
        "23" : "repeatcnt",
        "24" : "sport",
        "25" : "dport",
        "26" : "natsport",
        "27" : "natdport",
        "28" : "flags",
        "29" : "proto",
        "30" : "action",
        "31" : "url_filename_misc",
        "32" : "threatid",
        "33" : "category",
        "34" : "severity",
        "35" : "direction",
        "36" : "seqno",
        "37" : "actionflags",
        "38" : "srcloc",
        "39" : "dstloc",
        "40" : "",
        "41" : "",
        "42" : "",
        "43" : "",
        "44" : "",
        "45" : "",
        "46" : "",
        "47" : "",
        "48" : "",
        "49" : "",
        "50" : "",
        "51" : "",
        "52" : "",
        "53" : "",
        "54" : "",
        "55" : "",
        "56" : "",
        "57" : "",
        "58" : "",
        "59" : "device_name",
        "60" : "",
        "61" : "",
        "62" : "",
        "63" : "",
        "64" : "",
        "65" : "",
        "66" : "",
        "67" : "",
        "68" : "tunnel",
        "69" : "thr_category",
        "70" : "contentver",
        "71" : "",
        "72" : "",
        "73" : "",
        "74" : "",
        "75" : "",
        "76" : "rule_uuid",
        "77" : "",
        "78" : "",
        "79" : "",
        "99" : ""
    }
    return fieldmap_THREAT[s]
}