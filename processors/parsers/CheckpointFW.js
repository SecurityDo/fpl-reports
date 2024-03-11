// Description:
// Syslog (Event/Traffic logs) from Checkpoint Firewalls

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
  // event selection criteria
  let msg = obj["@message"]
  if (!msg){
    return {"status":"abort"}
  }

  if (!startsWith(msg, "1 ") || indexOf(msg, '[') < 0) {
    return {"status":"abort"}
  }

  let tags = obj["@tags"]
  if (!tags) {
      return {"status":"abort"}
  }

  // event parsing
  // remove the header
  let s = indexOf(msg, " [") 
  msg = subString(msg, s+2, len(msg)-1)

  let f = {}
  // check if starts with Fields and remove it if needed
  if (startsWith(msg, "Fields")) {
    s = indexOf(msg, " ")
    msg = subString(msg, s+1, len(msg))
    // uses ' ' as fields delimiter
    f = decoder_MixedKeyValue(msg)
  } else {
    // uses ; as fields delimiter
    let fields = split(msg, "\";")
    for (let i = 0; i < len(fields); i++) {
      let keyValue = split(fields[i], ":\"")
      let key = trim(keyValue[0], " ")
      let value = trim(keyValue[1], "\"")
      f[key] = value
    }
  }

  // output field settings
  obj["@type"] = "event"

  obj["@parser"] = "fpl-CheckpointFW"
  obj["@parserVersion"] = "20240228-1"
  obj["@event_type"]="checkpoint"
  obj["@eventType"]="Checkpoint"

  obj["@checkpoint"] = f

  // need to generate flow records for the events

  return {"status":"pass"}
}