// Description:
// Process alerts / events from SentinelOne Syslog integration

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
    // Event selection criteria
    let msg = obj["@message"]
    if (!msg){
        return {"status":"abort"}
    }
    let s = indexOf(msg, "CEF:2|SentinelOne")
    
    if (s < 0){
        let t = indexOf(msg, "sentinel -  SentinelOne")
        if (t > -1){
            obj["@parser"] = "fpl-SentinelOneSyslog"
            obj["@tags"] = ["SentinelOne"]
            return {"status":"pass"}
        }
        return {"status":"abort"}
    }
    
    // Output field settings
    obj["@type"] = "event"

    obj["@parser"] = "fpl-SentinelOneSyslog"
    obj["@parserVersion"] = "20231116-1"
    obj["@event_type"]="sentinelone"
    obj["@eventType"]="SentinelOneSyslog"

    let tags = ["SentinelOne"]
    obj["@tags"] = tags

    let split = split(msg, "|")
    //printf("%d",len(split))
    if (len(split) < 5) {
        return {"status":"abort"}
    }

    let f = {}

    for i, v = range split {
        let x = split(v, "=")
        if (len(x) < 2) {
            continue
        }
        let lc = x[0]
        if (lc =="sourceIpAddresses" || lc =="sourceMacAddresses" ) {
            f[lc] = x[1]
            f[lc+'List'] = parseArray(x[1])
        }else{
            f[lc] = x[1]
        }
    }

    obj["@sentinelone"] = f

    return {"status":"pass"}
}

function parseArray(s) {
    let items = []
    if (len(s) < 3) {
        return items
    }
    let ss = subString(s, 1, len(s) - 1)
    let x = split(ss, ",")
    for i, v = range x {
        let vv = subString(v, 2, len(v) - 1)
        // printf("%s",vv)
        items = append(items, vv)
    }
    return items
}