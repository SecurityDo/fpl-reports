// replacement for Java (Groovy) parser
// parses nxlog records w/ (merge_tag_colon_with_message)

function main(obj) {
    let m = merge_tag_colon_with_message(obj)
    // printf("array %v", m)
    
    if (startsWith(m,"{")) {
        //printf("pass")
        let o = parseJson(m)
        
        //printf("%v", o.Noexist)
        if (o) {
            //ok
        } else {
            // printf("no fields")
            obj["@tags"] = ["_jsonParseError"]
            return {"status":"reject","msg":"no fields obj"}
        }
        if (o.Message) {
            obj["@message"] = o.Message
            delete(o, "Message")
        } else {
            return {"status":"reject","msg":"no message in obj"}
        }
        
        if (o.LogonProcessName) {
            //printf("|%s|",obj["@fields"].LogonProcessName)
            o.LogonProcessName = trimSpace(o.LogonProcessName)
            //printf("|%s|",obj["@fields"].LogonProcessName)
        }
        
        //if o.SourceModuleName && o.SourceModuleName=="dhcp_in" {
        //    printf("dhcp")
        //}
        
        if (o.SourceModuleName) {
            if (o.SourceModuleName=="dhcp_in") {
                //printf("dhcp nested")
                let segments = split(obj["@message"],",")
                //printf("%v",len(segments))
                if (len(segments) < 7) {
                    return {"status":"reject","msg":"dhcp msg too short"} 
                }
                o["type"] = segments[3]
                o["clientIp"] = segments[4]
                o["hostname"] = segments[5]
                o["clientMac"] = segments[6]
                o["eventType"] = segments[0]
                obj["@tags"] = ["windows-dhcp"]
                obj["@eventType"] = "nxlogDHCP"
            }
        }
        
        if (o.SourceModuleType) {
            if (o.SourceModuleType=="im_msvistalog") {
                if (o.EventType) {
                    // set tags to eventType
                    obj["@tags"] = [o.EventType]
                }
                obj["@eventType"] = "nxlogAD"
            } 
        }
        obj["@fields"] = o
    } else {
        return {"status":"reject","msg":"invalid json message (no '{')"} 
    }
    
   return {"status":"pass"}
}

function merge_tag_colon_with_message(obj) {
    let tags = obj["@tags"]
    let p = ""
    if (tags) {
        p = tags[0]
    }
    let msg = obj["@message"]
    let q = p + ":" + msg
    // printf("array %v", q)
    return q
}