function eventSizeByField(env, field) {
    let env = {from: env.from, to: env.to, field}
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"}
        let {{.field}}=f("@{{.field}}"), size=f("__size__")
        aggregate totalSize=sum(size), eventCount=count() by {{.field}}
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function eventSizeByEventType(env) {
    let fplTemplate = `
        search {from="{{.from}}", to="{{.to}}"}
        assign eventType=f("@eventType"), event_type=f("@event_type"), size=f("__size__")
        let eventtype = coalesce(eventType, event_type)
        aggregate totalSize=sum(size), eventCount=count() by eventtype
        sort 10 totalSize
    `
    let table = fluencyLavadbFpl(template(fplTemplate, env))
    return table
}

function main() {
    let env = {from: "-24h<h", to: "@h"}
    setEnv("from", env.from)
    setEnv("to", env.to)
    let statsBySource = eventSizeByField(env, "source")
    let statsBySender = eventSizeByField(env, "sender")
    let statsByEventType = eventSizeByEventType(env)

    let totalStats = statsByEventType.GroupBy(({totalSize}) => {
        return {
            columns: {
                sum: {totalIngressSize: totalSize},
                count: {totalEventTypes: true}
            }
        }
    })

    let totalStatsBySender = statsBySender.GroupBy(({totalSize, eventCount}) => {
        return {
            columns: {
                sum: {totalIngressSize: totalSize},
                sum: {totalEventCount: eventCount}
            }
        }
    })
    totalStatsBySender.NewColumnLambda("totalEPS", "", (row) => row.totalEventCount / 86400)
    totalStatsBySender.NewColumnLambda("totalEPH", "", (row) => row.totalEventCount / 24)

    let topSizeBySource = statsBySource.Sort(10, "totalSize")
    let topSizeBySender = statsBySender.Sort(10, "totalSize")
    let topSizeByEventType = statsByEventType.Sort(10, "totalSize")

    return {
        totalStats,
        totalStatsBySender,
        topSizeBySource,
        topSizeBySender,
        topSizeByEventType
    }
}