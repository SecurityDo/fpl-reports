// Description:
// Syslog (Event/Traffic logs) from Sophos Firewalls

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
  // event selection criteria
  let msg = obj["@message"]
  if (!msg){
    return {"status":"abort"}
  }
  let tags = obj["@tags"]
  if (!tags) {
      return {"status":"abort"}
  }
  if (!tags.Some( (_, tag) => startsWith(tag, "sophos" ))) {
    return {"status":"abort"}
  }

  // event parsing
  // check if msg starts with timestamp
  let s = indexOf(msg, "]:") 
  if (s > 0) {
    msg = subString(msg, s+2, len(msg))
  }
  // check if ether type is present and if the value is encoded with quotes
  if (indexOf(msg, "ether_type") > 0) {
    if (indexOf(msg, "ether_type=\"") < 0) {
      msg = replaceAll(msg, "ether_type=(?P<Value>[a-zA-Z0-9]+) (?P<IP>[a-zA-Z0-9()]+)", "ether_type=\"${1}${2}\"", -1)
    }
  }
  let f = decoder_MixedKeyValue(msg)

  // output field settings
  obj["@type"] = "event"

  obj["@parser"] = "fpl-SophosFW"
  obj["@parserVersion"] = "20240227-1"
  obj["@event_type"]="sophos"
  obj["@eventType"]="Sophos"

  obj["@sophos"] = f

  // need to generate flow records for the events

  return {"status":"pass"}
}