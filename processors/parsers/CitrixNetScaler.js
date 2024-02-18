// Description:
// Syslog (Event/Traffic logs) from Citric NetScaler

// Data input format: ({ obj, size, source }) or ( doc )
function main({obj, size, source}) {
  // Event selection criteria
  let msg = obj["@message"]
  if (!msg){
      return "abort"
  }

  let tags = obj["@tags"]
  if (!tags) {
      return "abort"
  }
  
  if (indexOf(msg, "  ") != 8 || len(tags[0]) != 10) {
      return "abort"
  }
  
  // Event parsing
  let f = processMSG(msg)
  if (isNull(f)) {
      // printf("no netscaler")
      return "abort"
  }
  
  // Output field settings
  obj["@type"] = "event"

  obj["@parser"] = "CitrixNetScalerParser"
  obj["@parserVersion"] = "20240213-1"
  obj["@event_type"]="@netscaler"
  obj["@eventType"]="NetScaler"
  
  obj["@netscaler"] = f
  
  return "pass"
}

function processMSG(msg) {
  let fields = {}
  
  // trim the date portion
  let s = indexOf(msg, "  ")
  if (s < 0) {
      // printf("NetscalerParserError - No split point")
      return null
  }
  let msg = subString(msg, s+1, len(msg))
  // trim unused front portion
  s = indexOf(msg, ":")
  if (s < 0) {
      // printf("NetscalerParserError - No data")
      return null
  }
  msg = subString(msg, s+1, len(msg))
  
  // extract the header portion and add the feature, msg and id
  s = indexOf(msg, ":")
  if (s < 0) {
      // printf("NetscalerParserError - No header data")
      return null
  }
  let header = subString(msg, 0, s)
  let hs = split(trim(header, " "), " ")
  if (len(hs) < 5) {
      // printf("NetscalerParserError - Invalid header")
      return null
  }
  fields["cn_feature"]=hs[1]
  fields["cn_msg"]=hs[2]
  fields["cn_id"]=hs[3]
  msg = subString(msg, s+1, len(msg))
  
  // handles different cn_msg types
  if (fields["cn_msg"] == "HTTPREQUEST") {
      let message = trim(msg, " ")
      message = replace(message, "\"", "", 0)
      message = toLower(message)
      fields["msg"] = message
  } elseif (fields["cn_msg"] == "Message") {
      // find message to be encrypted
      let message = split(msg, "\"")[1]
      fields["msg"] = message
  } else {
      // break the msg into segments
      let segments = split(msg, "-")
      for (let i = 0; i < len(segments); i++) {
          let key_val = split(trim(segments[i], " "), " ")
          if (len(key_val) > 2) {
              if (len(key_val) > 3) {
                  printf("key has too many fields: %v", key_val)
                  fields["@parserError"] = key_val
              } else {
                  let key = key_val[0] + "_" + key_val[1]
                  key = toLower(key)
                  let val = key_val[2]
                  fields[key] = val
              }
          } else {
              let key = toLower(key_val[0])
              let val = key_val[1]
              fields[key] = val
          }
      }
      
      // check for client ip field
      let cip = fields["client_ip"]
      if (cip) {
          //check to see if it is ipv4 or ipv6
          if (isIPv4(cip) || isIPv6(cip)) {
              let geo_ip = geoip(cip)
              fields["_ip"] = geo_ip
          } else {
              printf("cip needs to be parsed")
          }
      }
  }
  
  return fields
}
