
function main() {
    let table = loadADAssets()
    let list = table.Map( (row) => row)
    Platform_Asset_Refresh("AD", list)
    return {table}
}


function loadADAssets() {

  let assets = Fluency_ResourceLoad("AD", "asset", "*", (obj, customer) => {
      let fields = obj["@ADAsset"]
      let {customer, name, description, dNSHostName, updatedOn, propertyFlags} = fields
      if (propertyFlags.Some((_, e) => e == "ACCOUNTDISABLE")) {
        return null
      }
      return {
         aggregate:{
           groupBy:{name},
           columns: {
	     argmax:{updatedOn, description, fqdn:dNSHostName, flags:propertyFlags, customer}
           }
         }
      }
  })
  return {assets}
}
