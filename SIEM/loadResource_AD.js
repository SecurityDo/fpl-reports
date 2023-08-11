function main() {

  let assets = Fluency_ResourceLoad("AD", "asset", "*", (obj) => {
      let fields = obj["@ADAsset"]
      let {customer, name, sAMAccountName, description, dNSHostName, updatedOn, propertyFlags} = fields    
      // return {name, sAMAccountName, description, dNSHostName, updatedOn, propertyFlags} 
         
      return {
         aggregate:{
           groupBy:{name},
           columns: {
             argmax:{updatedOn, sAMAccountName, description, dNSHostName, propertyFlags}, 
             values:{customers:customer}
         }
       }       
  })
  return {assets}
}

