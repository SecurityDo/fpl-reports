// Description:
// Syslog (Event/Traffic logs) from SonicWall Firewalls

// {
//  "@message": "sn=1SN2345678 time=\"2023-10-30 17:02:28 UTC\" m=537 msg=\"Connection Closed\" appName='Service iMesh' proto=tcp/4433 sent=1497 fw_action=\"NA\"",
//  "@facility": "local0"
// }

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {

    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }
    
    if (!startsWith(msg, "sn=")){
        return {"status":"abort"}
    }
    let tags = obj["@tags"]
    if (!tags) {
        return {"status":"abort"}
    }
    if (!tags.Some( (_, tag) => startsWith(tag, "id=" ))) {
        return {"status":"abort"}
    }

    obj["@type"] = "event"

    obj["@parser"] = "fpl-SonicWallFWSyslog"
    obj["@parserVersion"] = "20231030-5"
    
    let m = mergeTagWithMessage(obj)
    let f = decoder_MixedKeyValue(m)
    
    obj["@event_type"]="sonicwall"
    obj["@eventType"]="SonicWallNGFW"
    obj["@sonicwall"] = f
    
    sonicwallFieldAdjustments(f)

    tags = ["sonicwall"]
    if (f.msg == "SSL VPN zone remote user login allowed"){
        tags = append(tags, "vpnlogin")
    }
    obj["@tags"] = tags

    generateFusionEvent(f,obj["@timestamp"])

    // device name
    let deviceName = (f.sn ? f.sn : "unknown")
    recordDeviceMetrics(obj, size, deviceName)

    return {"status":"pass"}
}

function generateFusionEvent(f,ts) {
    let m = f.m // event type/id
    let allowed = ["97", "98", "537", "1235", "602", "1197", "597", "598", "1154", "971", "972", "938", "173", "174", "36", "37", "760", "41", "1198", "1199", "14", "524" ]
    let isAllowed = allowed.Some((_,e) => e == m)
    if(!isAllowed) {
        return //  wrong event type/id
    }
    // process flows
    
    if (!(f.sip && f.sp && f.dip && f.dp && f.protocol)) {
        printf("invalid event record for flow: %v", f)
        return
    }
    let dur = 1000
    if (m=="537"){
        dur = f.cdur
    }
    
    let envelop={
        partition: "default",
        dataType: "event",
        time_ms: ts
    }
    let source={
        flow: {
            sip: f.sip,
            dip: f.dip,
            sp: f.sp,
            dp: f.dp,
            prot: f.protocol,

            dur: dur,
            rxB: f.rcvd,
            txB: f.sent,
            rxP: f.rpkt,
            txP: f.spkt,
            time_ms: ts
        },
        dtype:"sw_traffic"
    }
    if (source.flow.rxB > 0 || source.flow.txB > 0) {
        source.flow.totalB = source.flow.rxB + source.flow.txB
    }
    if ( m=="97" || m=="14" ){
        if (f.dstname && f.referer) {
            source.meta = [{
                url: f.dstname,
                referer:f.referer,
            }]
        } elseif (f.dstname) {
            source.meta = [{
                url: f.dstname,
            }]
        }
    }
        
    if (f.fw_action == "drop") {
        source.flags = ["fwdeny"]
    }
   
    // printf("%v",source)
    Fluency_FusionEvent(envelop, source)
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

function sonicwallFieldAdjustments(doc) {
    let srcValue = doc.src
    if (srcValue) {
        let ss = split(srcValue, ":")
        if (len(ss) > 1) {
            let sip = ss[0]
            doc.sip = sip
            doc.sp = parseInt(ss[1])
            let results = geoip(sip)
            if (results && results.countryCode ){
            } else {
                results = {country: "Unknown", city: "Unknown", org: "Unknown", isp: "Unknown", countryCode: "--"}
            }
            doc._ip=results
        }
    }
    let dstValue = doc.dst
    if (dstValue) {
        let dd = split(dstValue, ":")
        if (len(dd) > 1) {
            doc.dip = dd[0]
            doc.dp = parseInt(dd[1])
        }
    }
    doc.protocol = parseProto(doc.proto)
    
    doc.rcvd = parseInt(doc.rcvd)
    doc.sent = parseInt(doc.sent)
    doc.rpkt = parseInt(doc.rpkt)
    doc.spkt = parseInt(doc.spkt)

    return doc
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
            group:"FPL-detect: SonicWall NGFW",
            device: {
                name:"SonicWall NGFW",
                category:"Firewall"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"SonicWallNGFW",
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
