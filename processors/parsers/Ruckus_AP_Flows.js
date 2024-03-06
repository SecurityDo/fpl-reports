// Description:
// Syslog (Event/Traffic logs) from Ruckus Access Points

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
  // event selection criteria
  let msg = obj["@message"]
  if (!msg){
    return {"status":"abort"}
  }

  if (!startsWith(msg, "Ruckus-AP New Flow")) {
    return {"status":"abort"}
  }

  // event parsing
  // remove the header
  let s = indexOf(msg, "Ruckus-AP New Flow") 
  msg = subString(msg, s+20, len(msg))
  // remove quotes
  let f = processMSG(msg)

  // output field settings
  obj["@type"] = "event"

  obj["@parser"] = "fpl-Ruckus_AP_Flows"
  obj["@parserVersion"] = "20240304-1"
  obj["@event_type"]="ruckus"
  obj["@eventType"]="Ruckus"

  obj["@ruckus"] = f

  // need to generate flow records for the events
  let metaflow = generateMetaflow(f, obj)
  if (!isNull(metaflow)) {
    obj["@metaflow"] = metaflow
    let envelop = {
      partition: "default",
      dataType: "event",
      time_ms: obj["@timestamp"]
    }
    Fluency_FusionEvent(envelop, {flow:metaflow.flow})
  }

  return {"status":"pass"}
}

// process the message into a JSON object
function processMSG(msg) {
  let fields = {}

  let fieldValues = split(msg, "\",\"")
  for (let i = 0; i < len(fieldValues); i++) {
    let kv = split(fieldValues[i], "=")
    let fieldName = trim(kv[0], "\"")
    let fieldValue = trim(kv[1], "\"")
    fields[fieldName] = fieldValue
  }
  return fields
}

// generate the metaflow object record if possible
function generateMetaflow(f, obj) {
  // checks if all metaflow fields are present
  if (!(f["Src_IP"] && f["Dst_IP"] && f["Src_port"] && f["Dst_port"] && f["L4protocol"])) {
    return null
  }

  return {
    flow: {
      sip: f["Src_IP"],
      dip: f["Dst_IP"],
      sp: parseInt(f["Src_port"]),
      dp: parseInt(f["Dst_port"]),
      proto: parseProto(f["L4protocol"]),
      time_ms: obj["@timestamp"]
    }
  }
}

// helper function to parse the protocol
function parseProto(proto) {
  let p = 0
  if (proto == "TCP" || proto == "tcp") {
    p = 6
  } elseif (proto == "UDP" || proto == "udp") {
    p = 17
  } elseif (proto == "ICMP" || proto == "icmp") {
    p = 1
  } elseif (proto == "IGMP" || proto == "igmp") {
    p = 2
  } elseif (proto == "ICMPv6" || proto == "icmpv6") {
    p = 58
  } else {
    if (!proto) {
      p = 0
    } elseif (startsWith(proto, "Other: ")){
      let s = indexOf(proto, ":")
      p = parseInt(proto.substring(s+2,proto.length))
    } else {
      printf("unknown proto: %s", proto)
      p = 0
    } 
  }
  return p
}