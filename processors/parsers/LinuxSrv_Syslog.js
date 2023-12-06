// Description:
// Syslog from Enterprise Linux (RedHat, etc) servers
// Default action: { status: "abort" }

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

    // Event parsing
    let f = {}
    if (tags.Some( (_, tag) => content(tag, "audispd" ))) {
        f = decoder_MixedKeyValue(msg)
        obj["@event_type"]="auditd"
        obj["@auditd"] = f
    } elseif (tags.Some( (_, tag) => content(tag, "sshd" ))) {
        f = parserSSHDLogs(msg)
        obj["@event_type"]="sshd"
        obj["@sshd"] = f
    } else {
        // unknown
        return {"status":"abort"}
    }

    // Output field settings
    obj["@type"] = "event"

    obj["@parser"] = "fpl-LinuxServerSyslog"
    obj["@parserVersion"] = "20231128-3"
    // obj["@event_type"]="linux"
    // obj["@eventType"]="Linux"
    // obj["@linux"] = f
    // obj["@tags"] = tags

    // Collect device metrics
    let deviceName = (obj["@source"] ? obj["@source"] : "unknown")
    recordDeviceMetrics(obj, size, deviceName)

    return {"status":"pass"}
}

function parserSSHDLogs(msg) {
    let f = {}
    let split = split(msg, " ")
    if (len(split) < 6) {
        f.parserError = "ignored"
        return f
    }

    if (startsWith(msg, "error: PAM: ")) {
        if (len(split) > 7){
            f.method = "keyboard-interactive/pam"
            f.user = split[5]
            let r = split[3]
            if (r == 'failure'){
                r = "failed"
            } else {
                r ="unknown"
            }
            f.result = r
            let h = split[7]
            if(isValidIP(h)){
                f.sip = h
            }else{
                f.shost = h
            }
        } else {
            f.parserError = "sshd pam event too short"
            return f
        }
    } else {
        if (startsWith(msg, "Accepted") || startsWith(msg, "Failed")) {
            // okay
        } else {
            if (split[5] == "Accepted" || split[5] == "Failed") {
                split = arraySlice(split, 5)
            } else {
                f.parserError = "skipped"
                return f
            }
        }
        let user = ""
        let num = 0
        for (let i = 4; i < len(split); i++) {
            if (split[i] == "from") {
                user = user + split[i - 1]
                num = i
                break
            } else {
                user += split[i - 1] + " "
            }
        }
        if (len(split) >= num + 2) {
            f.sip = split[num + 1]
            let results = geoip(f.sip)
            f._ip=results
        } else {
            f.parserError = "sshd missing source ip"
            return f
        }
    
        if (len(split) >= num + 4) {
            f.sp = split[num + 3]
        } else {
            f.parserError = "sshd missing source port"
            return f
        }
    
        if (user != "") {
            f.user = user
            if (startsWith(user, "invalid user")){
                f.user = subString(user, 13, len(user)-1)
                f.err = "invalid user"
            }
        } else {
            f.parserError = "sshd no user"
            return f
        }
        
        f.method = split[1]
    
        if (split[1] == "publickey") {
            //print("true");
            f.fingerprint = split[len(split) - 1]
        }
    
        f.result = toLower(split[0])
    }
    return f
}

function arraySlice(arr, index) {
    let n = []
    for (let i = 0; i < len(arr); i++) {
        if(i >= index){
            n = append(n, arr[i])
        }
    }
    return n
}

function recordDeviceMetrics(obj, size, deviceName) {
    let sender = obj["@sender"]
    let source = obj["@source"]

    let deviceEntry = Fluency_Device_LookupName(deviceName)
    if (!deviceEntry) {
        deviceEntry = {
            name:deviceName,
            ips: [sender],
            group:"FPL-detect: Linux Server",
            device: {
                name:"Linux Server",
                category:"Application Server"
            }
        }
        Fluency_Device_Add(deviceEntry)
    }
    let dimensions = {
        namespace:"fluency",
        app:"import",
        eventType:"Linux",
        syslogSender:sender,
        // syslogDevice:deviceEntry.name,
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
