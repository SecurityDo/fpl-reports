/*

*/

function main(obj) {   
    return parse(obj)
}

function parse(obj) {
    obj["@parser"] = "CheckpointFirewallEventParser"
    obj["@parserVersion"] = "20220224-1"
    
    let {msg} = regexp("\[(?P<msg>.*)\]", obj["@message"])
    
    let f = {}

    let split = split(msg, `";`)
    
    printf("%s", obj["@message"])

    for i, v = range split {
      let sp = split(v, `:"`)
      if(len(sp) == 2){
          f[trim(sp[0], " ")] = replace(replace(sp[1], `"`, "", -1), "'", "", -1)
      }
    }
    
    if (!isNull(f["dst"]) && !isUndef(f["dst"])){
        let results = geoip(f["dst"])
        f["_ip"] = results
    }
    
    if (!isNull(f["src_user_name"]) && !isUndef(f["src_user_name"])){        
        let {username} = regexp("(?P<username>.*)\(", f["src_user_name"])
        f["username"] = trim(username, " ")
    }
    
    if (content(f["protection_type"], "DNS reputation")){
         let {dns_domain} = regexp(":(?P<dns_domain.*>)", f["resource"])
         f["dns_domain"] = trim(dns_domain, " ")
    }
    
    let tags = []
    
    if (!isNull(f["product"]) && !isUndef(f["product"])){        
        tags = append(tags, replace(f["product"], " ", "", -1))
    }
    tags = append(tags, "checkpoint")

    obj["@tags"] = tags

    obj["@event_type"] = "@checkpoint"
    obj["@eventType"] = "CheckPoint"
    obj["@checkpoint"] = f
    
    return {"status":"pass"}
}