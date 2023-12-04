// {
//  "@message": "date=2023-07-17 time=11:13:00 devname=\"ABCD\" devid=\"FGT401234567AB\"  dstcountry=\"United States\"",
//  "@facility": "local7"
// }

// normal fortigate, parse_space_delimited_quoted_str
function main(obj) {   
    let m = parse_space_delimited_quoted_str(obj,"=")
    //printf("array %v", m)
    obj["@fields"]=m
    return {"status":"pass"}
}

function parse_space_delimited_quoted_str(obj,delimiter) {
    let msg = obj["@message"]
    let m = split(msg,"") // by-pass missing string charAt() function
    //printf("array %v", m)
    // let q = []
    let res = {}
    let quote_state = false
    let done = false
    let chunk = ""
    for let i = 0; i < len(m); i++ {
        let ch = m[i]
        // printf("%v",ch)
        if i == len(m)-1 {
            done = true
        }
        if ch == `"` {
            quote_state = !quote_state
            ch = ""
        }
        if !quote_state && ch == " " {
            done = true
            ch = ""
        }
        if done {
            chunk = chunk + ch
            //q = append(q, chunk)
            let parts = split(chunk,"=")
            if len(parts) > 1 {
                let k = replace(parts[0], " ", "", -1)
                let v = trim(parts[1], " ")
                res[k] = v
            }
            //printf("chunk %v", chunk)
            chunk = ""
            done = false
        } else {
            chunk = chunk + ch
        }
    }
    printf("obj %v", res)
    return res
}