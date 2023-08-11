function totalbytes(env) {
    let fplTemplate = `
        search %s
        let sent=f("@fields.bytes_sent"),recvd=f("@fields.bytes_recvd"),session=f("@fields.session_state")
        let sent2=parseInt(sent),recvd2=parseInt(recvd)
        where session=="END"
        aggregate s=sum(sent2+recvd2)
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function totalbytes_per_hour(env) {
    let fplTemplate = `
        search %s
        let sent=f("@fields.bytes_sent"),recvd=f("@fields.bytes_recvd"),session=f("@fields.session_state"),timestamp=f("@timestamp")
        let sent2=parseInt(sent),recvd2=parseInt(recvd)
        where session=="END"
        let Hour=strftime("%D:%H:%M",timebucket("1h",timestamp))  
        aggregate s=sum(sent2+recvd2)by Hour
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function src_change(env) {
    let fplTemplate = `
        search %s and sStartswith("@fields.src","192")
        let src=f("@fields.src"),session=f("@fields.session_state"),timestamp=f("@timestamp")
        where session=="END"
        aggregate src_count=count() by src
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function main() {
    let env = `
        {from="-25h<h", to="-1h>h"} sContent("@source","surf-soho-6ccb")
    `
    
    let totalbytesResult = totalbytes(env)
    let src_changeResult = src_change(env)
    let totalbytes_per_hourResult = totalbytes_per_hour(env)

    return {
        totalbytesResult,
        src_changeResult,
        totalbytes_per_hourResult
    }
}








