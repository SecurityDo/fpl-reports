// Description:
// Syslog (Event/Traffic logs) from Fastly Webservers

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
  // event selection criteria
  let msg = obj["@message"]
  if (!msg){
    return {"status":"abort"}
  }

  let tags = obj["@tags"]
  if (!tags || !tags.Some((_, tag) => tag == "FluencySecurity")) {
    return {"status":"abort"}
  }

  // event parsing
  msg = replace(msg, "\"", "", -1)
  let f = processMSG(msg)
  if (isNull(f)) {
    return {"status":"abort"}
  }

  // output field settings
  obj["@type"] = "event"

  obj["@parser"] = "fpl-FastlyWebserver"
  obj["@parserVersion"] = "20240304-1"
  obj["@event_type"]="fastly"
  obj["@eventType"]="Fastly"

  obj["@fastly"] = f

  // need to generate flow records for the events

  return {"status":"pass"}
}

// process the message into a JSON object
function processMSG(msg) {
  let hits = regexp(`(?P<ClientIP>\S*) (?P<Discard1>\S*) (?P<UserID>\S*) (?P<Discard2>\S*) (?P<Discard3>\S*) (?P<Method>\S*) (?P<Resource>\S*) (?P<Protocol>\S*) (?P<StatusCode>\S*) (?P<ObjSize>\S*)`, msg)  
  if (hits) {
    return {
      "client_ip": hits.ClientIP,
      "user_id": hits.UserID,
      "method": hits.Method,
      "resource": hits.Resource,
      "protocol": hits.Protocol,
      "status_code": hits.StatusCode,
      "obj_size": hits.ObjSize
    }
  }
  return null
}