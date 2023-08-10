function eventSizeBySource(env) {
    let fplTemplate = `
        search %s
        assign source=f("@source"), size=f("__size__")
        aggregate totalSize=sum(size), eventCount=count() by source
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function eventSizeBySender(env) {
    let fplTemplate = `
        search %s
        assign sender=f("@sender"), size=f("__size__")
        aggregate totalSize=sum(size), eventCount=count() by sender
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function eventSizeByEventType(env) {
    let fplTemplate = `
        search %s
        assign eventType=f("@eventType"), event_type=f("@event_type"), size=f("__size__")
        let eventtype = coalesce(eventType, event_type)
        aggregate totalSize=sum(size), eventCount=count() by eventtype
    `
    let table = fluencyLavadbFpl(sprintf(fplTemplate, env))
    return table
}

function main() {
    let env = `{from="-24h<h", to="-1h>h"}`
    
    let statsBySource = eventSizeBySource(env)
    let statsBySender = eventSizeBySender(env)
    let statsByEventType = eventSizeByEventType(env)
    
    let totalStats = statsByEventType.GroupBy(({totalSize})=>{
        return {columns:{ sum: {totalIngressSize: totalSize}, count: {totalEventTypes: true}}}
    })
    
    let totalStatsBySender = statsBySender.GroupBy(({totalSize, eventCount})=>{
        return {columns:{ sum: {totalIngressSize: totalSize}, sum: {totalEventCount: eventCount}}}
    })
    totalStatsBySender.NewColumnLambda("totalEPS", "", (row)=>row.totalEventCount / 86400)
    totalStatsBySender.NewColumnLambda("totalEPH", "", (row)=>row.totalEventCount / 24)
    
    let topSizeBySource = statsBySource.Clone().Sort(10, "totalSize")
    let topSizeBySender = statsBySender.Clone().Sort(10, "totalSize")
    let topSizeByEventType = statsByEventType.Clone().Sort(10, "totalSize")
    
    return {statsBySource, statsBySender, statsByEventType, totalStats, totalStatsBySender, topSizeBySource, topSizeBySender, topSizeByEventType}
}







