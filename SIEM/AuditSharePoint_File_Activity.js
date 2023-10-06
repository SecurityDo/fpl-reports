function validateTimeRange(from, to) {
  if (from.After(to)) {
    throw new Error("rangeFrom must be less than rangeTo", "RangeError")
  }
  return true
}

function main({from="-24h@h", to="@h"}) {
  validateTimeRange(new Time(from), new Time(to))
  let env = {from, to}
  setEnv("from", from)
  setEnv("to", to)
  let fplTemplate = `
    search { from="{{.from}}", to="{{.to}}"  } sContent("@source", "Audit.SharePoint") and sContent("@fields.Workload","OneDrive") or sContent("@fields.Workload","SharePoint") 
    let {Operation, CreationTime, SourceFileName, UserId, SourceRelativeUrl} = f("@fields")
    let {ClientAppName} = f("@fields.AppAccessContext")
    let {isp, city, country} = f("@fields._ip")
    where sContent(Operation,"FileDownloaded") or sContent(Operation,"FileUploaded") or sContent(Operation,"FileDeleted")
    sort +Operation, +CreationTime, +SourceFileName
  `
  let table = fluencyLavadbFpl(template(fplTemplate, env))
  return {table}
}
