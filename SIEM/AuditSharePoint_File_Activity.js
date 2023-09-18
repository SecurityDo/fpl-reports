function main() {
  let fplTemplate = `
    search { from="-24h@h", to="@h"  } sContent("@source", "Audit.SharePoint") and sContent("@fields.Workload","OneDrive") or sContent("@fields.Workload","SharePoint") 
    let {Operation, CreationTime, SourceFileName, UserId, SourceRelativeUrl} = f("@fields")
    let {ClientAppName} = f("@fields.AppAccessContext")
    let {isp, city, country} = f("@fields._ip")
    where sContent(Operation,"FileDownloaded") or sContent(Operation,"FileUploaded") or sContent(Operation,"FileDeleted")
    sort +Operation, +CreationTime, +SourceFileName
  `
  let table = fluencyLavadbFpl(template(fplTemplate, {}))
  return {table}
}
