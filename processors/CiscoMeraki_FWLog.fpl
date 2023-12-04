// Description:
// Syslog (Event/Traffic logs) from Cisco Meraki Firewalls

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    // Event selection criteria
    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }

    let tags = obj["@tags"]
    if (!tags) {
        return {"status":"abort"}
    }
    if (!tags.Some( (_, tag) => startsWith(tag, "1" ))) {
       return {"status":"abort"}
    }

    if (!startsWith(msg, "16") && !startsWith(msg, "17") && !startsWith(msg, "18") && !startsWith(msg, "19")){
        return {"status":"abort"}
    }

    // Output field settings
    obj["@type"] = "event"

    obj["@parser"] = "fpl-CiscoMerakiSyslog"
    obj["@parserVersion"] = "20231203-2"
    obj["@event_type"]="meraki"
    obj["@eventType"]="CiscoMeraki"

    // Event parsing
    // msg

    let sp = split(msg, " ")
    if (len(sp) < 6) {
        obj["@parserError"] = "Meraki event parser split error"
        return {"status":"abort"}
    }
    let f = {}
    tags = []
    if (indexOf(sp[1], "=") < 0) {
        tags = append(tags, sp[1])
        f.deviceName = sp[1]
    }
    if (indexOf(sp[2], "=") < 0) {
        tags = append(tags, sp[2])
        f.dataType = sp[2]
    }

    if(sp[3] == "dhcp"){
        let i = 0
        for s, item = range sp {
            // item = sp[s]
            // TODO: unparsed
            f["dhcp_item"+i]=item
            i++
        }
        continue
    }
    let i = -1
    for s, item = range sp {
        // find ending non-standard key:value string (w/o '=')
        if (indexOf(item, "request") > -1){
            i = s
            f.protocol = "tcp"
            break
        }
        if (indexOf(item, "pattern") > -1) {
            i = s
            break
        }
        // regulard fields
        let sp2 = split(item, "=")
        if (len(sp2) == 2) {
            let k = toLower(sp2[0])
            let v = replaceAll(sp2[1], "'", "", -1)
            f[k] = v
        }
    }
    if (i > -1) {
        let str = ""
        // for (let i = 0; i < len(list); i++)
        for (let j = i + 1; j < len(sp); j++) {
            str = str + sp[j] + " "
        }
        str = trim(str, " ")
        let key = replaceAll(sp[i], ":", "", -1)
        f[key] = str
    }
    /*
    if(sp[2] == "flows"){
        let a = sp[3]
        if (indexOf(a, "=") < 0){
            f.action = a
        }
    }
    */
    if(f.src){
        let s = f.src
        let count = 0
        for (let i = 0; i < len(s); i++) {
            let c = subString(s, i, i+1)
            if (c == ':') {
                count++
            }
        }
        if (count == 1) {
            let sp2 = split(s, ':')
            f.src = sp2[0]
            f.sport = sp2[1]
        } elseif (count > 1) { // ipv6 support
            // uhh.
            /*
            let index = s.lastIndexOf(":")
            if(index >-1){
                f.src = s.substring(0, index).replace(/[\[\]']+/g, '')
                f.sport = s.substring(index+1, src.length)
            }
            */
        }
    }
    if(f.dst){
        let d = f.dst
        let count = 0
        for (let i = 0; i < len(d); i++) {
            let c = subString(d, i, i+1)
            if (c == ':') {
                count++
            }
        }
        if (count == 1) {
            let sp2 = split(d, ':')
            f.dst = sp2[0]
            f.dport = sp2[1]
        } elseif (count > 1) { // ipv6 support
            // uhh.
            /*
            let index = s.lastIndexOf(":")
            if(index >-1){
                f.dst = s.substring(0, index).replace(/[\[\]']+/g, '')
                f.dport = s.substring(index+1, dst.length)
            }
            */
        }
    }


    // adjust src/dest ip (ip w/ port, ipv6, etc)


    //tags = append(tags, deviceName)
    obj["@tags"] = tags

    obj["@meraki"] = f

    // Discard original message
    // obj["@message"] = ""

    // Collect device metrics
    recordDeviceMetrics(obj, size)

    // Metaflow, data normalization
    generateFusionEvent(obj)

    return {"status":"pass"}
}

function recordDeviceMetrics(obj, size) {
    let sender = obj["@sender"]
    let source = obj["@source"]
    let f = obj["@meraki"]

    let deviceName = (f.deviceName ? f.deviceName : "unknown")

    let deviceEntry = Fluency_Device_LookupName(deviceName)
    if (!deviceEntry) {
        deviceEntry = {
            name:deviceName,
            ips: [sender],
            group:"FPL-detect: Cisco Meraki FW",
            device: {
                name:"Cisco Meraki FW",
                category:"Firewall"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"CiscoMeraki",
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

function generateFusionEvent(obj) {
    let f = obj["@meraki"]

    if (!(f.src && f.dst && f.sport && f.dport && f.protocol)) {
        // printf("invalid event record for flow: %v", f)
        return
    }

    let ts = obj["@timestamp"]

    let envelop = {
        partition: "default",
        dataType: "event",
        time_ms: ts
    }

    let sp = (f.sport ? parseInt(f.sport) : 0)
    let dp = (f.dport ? parseInt(f.dport) : 0)
    let prot = (f.protocol ? parseProto(f.protocol) : 0)

    let source={
        flow: {
            sip: f.src,
            dip: f.dst,
            sp: sp,
            dp: dp,
            prot: prot,

            rxB: 0,
            txB: 0,
            totalB: 0,
            rxP: 0,
            txP: 0,

            dur: 0,
            time_ms: ts
        },
        dtype:"meraki"
    }
    obj["@metaflow"] = source
    // printf("%v",source)
    Fluency_FusionEvent(envelop, source)
}
