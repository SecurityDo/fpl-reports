// Description:
// Syslog (Event/URL/Session logs) from Peplink Routers

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    let selected = false
    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }
    let tags = obj["@tags"]
    if (!tags) {
        return {"status":"abort"}
    }

    let f = {}
    if (startsWith(msg, "Session Logging:")){
        selected = true
        f = parseSessionURLLogs(msg)
        tags = append(tags, "Session")
        generateFusionEvent(obj, f)
    }
    if (startsWith(msg, "URL Logging:")){
        selected = true
        f = parseSessionURLLogs(msg)
        tags = append(tags, "URL")
        obj["@metaflow"] = generateURLFusionEvent(f, obj["@timestamp"])
    }
    
    if (startsWith(msg, "Server:")){
        selected = true
        f = parseDHCPLogs(msg)
        obj["@metaflow"] = generateDHCPFusionEvent(f, obj["@timestamp"])
    }
    
    if (tags.Some( (_, tag) => content(tag, "Firewall" ))) {
        selected = true
        f = parseFirewallLogs(msg)
    }
    
    if (!selected) {
        return {"status":"abort"}
    }
    
    obj["@type"] = "event"

    obj["@parser"] = "fpl-PeplinkRouterSyslog"
    obj["@parserVersion"] = "20231129-1"
    
    obj["@event_type"]="peplink"
    obj["@eventType"]="Peplink"
    obj["@peplink"] = f
    obj["@tags"] = tags

    // device name
    let deviceName = (obj["@source"] ? obj["@source"] : "unknown")
    recordDeviceMetrics(obj, size, deviceName)

    return {"status":"pass"}
}

function parseSessionURLLogs(msg) {
    let start = indexOf(msg, "Logging:")
    let m = subString(msg, start+9, len(msg))
    // printf("|%s|",m)
    if (startsWith(m,"Domain")){
        let cf = parseContentFilter(m)
        return cf
    }
    let map = decoder_MixedKeyValue(m)
    let f = {}
    for k, v = range map {
        let key = toLower(k)
        let value = v
        if (key == "bytes_recvd" || key == "bytes_sent" || key == "spt" || key == "dpt" || key == "snatpt" || key == "packets_recvd" || key == "packets_sent") {
            value = parseInt(v)
        }
        f[key] = value
    }
    return f
}

function parseFirewallLogs(msg) {
    let start = indexOf(msg, " ")
    let m = subString(msg, start+1, len(msg))
    // printf("|%s|",m)
    let map = decoder_MixedKeyValue(m)
    let f = {}
    for k, v = range map {
        let key = toLower(k)
        if (contains(key, " ")){
            continue // skip keys w/ spaces
        }
        let value = v
        if (key == "ttl" || key == "len" || key == "spt" || key == "dpt") {
            value = parseInt(v)
        }
        f[key] = value
    }
    return f
}

function parseDHCPLogs(msg) {
    let sp = split(msg, " ")
    let f = {}
    if (len(sp) > 8) {
        f.server = sp[1]
        f.client_ip = sp[3]
        let m = subString(sp[5], 0, len(sp[5]))
        f.client_mac = m
        f.lease = parseInt(sp[8])
    }
    return f
}

function generateDHCPFusionEvent(f,ts) {
    if (!(f.client_ip && f.client_mac && f.lease)) {
        printf("invalid event record for dhcp flow: %v", f)
        return
    }
    if (f.client_ip == "0.0.0.0" || f.client_ip == "255.255.255.255") {
        printf("invalid event record for dhcp flow: %v", f)
        return
    }
    let envelop={
        partition: "default",
        dataType: "event",
        fusion: "peplink",
        time_ms: ts
    }
    let source_req={
        dhcp: {
            type: "Request",
            clientMac: f.client_mac
        }
    }
    let source_ack={
        dhcp: {
            type: "Ack",
            clientMac: f.client_mac,
            clientIp: f.client_ip,
            lease: f.lease 
        }
    }
    // printf("%v",source_req)
    // printf("%v",source_ack)
    Fluency_FusionEvent(envelop, {dhcp:source_req.dhcp, dtype:"infoblox-dhcp"})
    Fluency_FusionEvent(envelop, {dhcp:source_ack.dhcp, dtype:"infoblox-dhcp"})
    return source_ack
}

function generateURLFusionEvent(f,ts) {
    if (!(f.src && f.dst && f.spt && f.dpt)) {
        printf("invalid event record for flow: %v", f)
        return
    }
    let envelop = {
        partition: "default",
        dataType: "event",
        fusion: "peplink",
        time_ms: ts
    }
    let source = {
        flow: {
            sip: f.src,
            dip: f.dst,
            sp: f.spt,
            dp: f.dpt,
            prot: 6,
            dur: 0,
            time_ms: ts
        }
    }
    if (f.sslcert) {
        let mObj = {
            url: f.sslcert,
            category: 'peplink_url'
        }
        if (f.srcmac) {
            mObj.srcmac = f.srcmac
        }
        source.meta = mObj // remove array
    }
    if (f.url) {
        let h = parseURL(f.url)
        let mObj = {
            url: h,
            category: 'peplink_url'
        }
        source.meta = mObj // remove array
    }
    if (f.action == "deny") {
        source.flags = "fwdeny" // remove array
    }
    // printf("%v",source)
    // printf("%v",{flow:source.flow, meta:[source.meta]})
    Fluency_FusionEvent(envelop, {flow:source.flow, meta:[source.meta], flags:[source.flags]})
    return source
}

function parseURL(url) {
    let h = ""
    if (startsWith(url, "https://")) {
        let u = subString(url, 8, len(url))
        let e = indexOf(u, "/")
        h = subString(u, 0, e)
    } elseif (startsWith(url, "http://")) {
        let u = subString(url, 7, len(url))
        let e = indexOf(u, "/")
        h = subString(u, 0, e)
    } elseif (indexOf(url, "/") > 1) {
        let e = indexOf(url, "/")
        h = subString(url, 0, e)
    } elseif (indexOf(url, ".") > 1) {
        h = url
    }
    return h
}

function parseContentFilter(msg) {
    let inside = false
    let items = []
    let buff = ""
    for let i = 0; i < len(msg); i++ {
        let c = subString(msg, i, i+1)
        if (c == "<"){
            inside = true
        } elseif (c == ">") {
            inside = false
            items = append(items, buff)
            buff = ""
        } else {
            if(inside) {
                buff = buff + c
            }
        }
    }
    if (len(items) != 3){
        printf("invalid event record for content filter: %s", msg)
        return {}
    }
    let f = {}
    f.domain = items[0]
    f.src = items[1]
    f.dst = "127.0.0.1"
    f.spt = "0"
    f.dpt = "80"
    f.category = items[2]
    
    if (contains(msg, "blocked")){
        f.action ="deny"
    }
    return f
}

function generateFusionEvent(obj, f) {
    if (!(f.src && f.dst && f.spt && f.dpt && f.proto)) {
        printf("invalid event record for flow: %v", f)
        return
    }

    let ts = obj["@timestamp"]

    let rxB = f.bytes_recvd //parseInt(f["bytes_recvd"])
    let txB = f.bytes_sent //parseInt(f["bytes_sent"])
    let rxP = f.packets_recvd //parseInt(f["packets_recvd"])
    let txP = f.packets_sent //parseInt(f["packets_sent"])
    
    if(f.session_state == "ESTABLISHED"){
        rxB = 0 // ignore bandwidth stats for established flows
        txB = 0
        rxP = 0
        txP = 0
    }
    let totalB = txB + rxB
    let envelop={
        partition: "default",
        dataType: "event",
        fusion: "peplink",
        time_ms: ts
    }
    let source={
        flow: {
            sip: f.src,
            dip: f.dst,
            sp: f.spt,
            dp: f.dpt,
            prot: parseProto(f.proto),
            dur: 0,
            rxB: rxB,
            txB: txB,
            totalB: totalB,
            rxP: rxP,
            txP: txP,
            time_ms: ts
        }
    }
    // printf("%v",source)
    obj["@metaflow"] = source
    Fluency_FusionEvent(envelop, {flow:source.flow})
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

function recordDeviceMetrics(obj, size, deviceName) {
    let sender = obj["@sender"]
    let source = obj["@source"]

    let deviceEntry = Fluency_Device_LookupName(deviceName)
    if (!deviceEntry) {
        deviceEntry = {
            name:deviceName,
            ips: [sender],
            group:"FPL-detect: Peplink Router",
            device: {
                name:"Peplink Router",
                category:"Network"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"Peplink",
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

