// Description:
// Reads / converts @timestamp from Server syslog as Local instead of UTC

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {

    if (source && source != "" ) {
        obj["@collector"] = source
    } else {
        obj["@collector"] = "fluency-server" // server side syslog collector ('local')
    }

    let ts = obj["@timestamp"]
    if (!ts) {
        return { status: "error" }
    }
    
    // Adjust timestamp based on Fluency Collector name
    if (obj["@collector"] == "collector-name" || obj["@collector"] == "cname-2") {
        let TZ = "America/New_York"
        let offset = timezoneOffset(TZ)
        // obj["@timestamp"] = ts - offset * 1000
    }

    // Adjust timestamp based on Syslog '@source' name
    if (obj["@source"] == "abc" || obj["@source"] == "defg") {
        let TZ = "America/New_York"
        let offset = timezoneOffset(TZ)
        // obj["@timestamp"] = ts - offset * 1000
    }

    // Generic timestamp adjustment logic
    // let TZ = "America/New_York"
    // let offset = timezoneOffset(TZ)
    // obj["@timestamp"] = ts - offset * 1000

    return { status: "abort" } // continue to next parser
}

