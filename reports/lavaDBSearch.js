function main() {
let fpl = `
    search {from="-24h@h", to="@h", dataType="event"} sContent("@sender","office365") and sContent("@source","Audit.AzureActiveDirectory")
    let {Operation} = f("@fields")
    aggregate events = count() by Operation
    sort 15 events
`
   let t1 = fluencyLavadbFpl(fpl, "event")
   printf("hello world")
   return {t1}
}

