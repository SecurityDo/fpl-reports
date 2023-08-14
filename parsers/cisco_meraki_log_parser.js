function main(obj) {   
    return parse(obj)
}

function parse(obj) {
    // Split message by space
    let msg = obj["@message"]
    let split = split(msg, " ")
    
    // Minimum splits check
    if (len(split) < 6){
        obj["@parserError"] = "Meraki event parser error"
        return {"status":"reject", "msg":"Meraki event parser error"} 
    }
    
    obj["@parser"] = "MerakiEventParser"
    obj["@eventType"] = "Meraki"
    obj["@parserVersion"] = "20220215-2"
    
    // @meraki field
    let f = {}
    
    // @tags field
    let tags = []
    
    // Check device and type
    if (!contains(split[1], "=")) {
        tags = append(tags, split[1])
        f["deviceName"] = split[1]
    }
    if (!contains(split[2], "=")) {
        tags = append(tags, split[2])
        f["dataType"] = split[2]
    }

    obj["@tags"] = tags

    // If is DHCP
    if(content(split[3], "dhcp")){
        for i, v = range split {
             f[sprintf("dhcp_item%d", i)] = v
        }
        obj["@meraki"] = f
        obj["@event_type"] = "@meraki"
    // If not DHCP
    }else{
        let x = 0
        
        for i, v = range split {
            // Assign all strings after the keyword to the field
            if (contains(v, "request") || contains(v, "pattern")) {
                let {str} = regexp(sprintf("%s (?P<str>.*)", v), msg)
                f[replace(v, ":", "", -1)] = str
                break
            }
            
            // Add attributes to field
            let sp = split(v, "=")
            if(len(sp) == 2){
                f[sp[0]] = replace(sp[1], "'", "", -1)
                x++
            }
        }
        
        // Seperate address and port, ipv6 supported
        if (!isUndef(f["src"]) && contains(f["src"], ":")) {                       
            let {st, port} = regexp("(?P<st>.*):(?P<port>.*)", f["src"])
            f["src"] = st
            f["sport"] = port
        }
        
        if (!isUndef(f["dst"]) && contains(f["dst"], ":")) {                       
            let {st, port} = regexp("(?P<st>.*):(?P<port>.*)", f["dst"])
            f["dst"] = st
            f["dport"] = port
        }
        
        if (content(split[2], "flows") && !contains(split[3], "=")) {
            f["action"] = split[3]
        }
        
        if(x > 0){
            obj["@meraki"] = f
            obj["@event_type"] = "@meraki"
        }
    }
    return {"status":"pass"}
}