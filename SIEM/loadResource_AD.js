function main() {

  let assets = Fluency_ResourceLoad("AD", "asset", "*", (obj, customer) => {
      let fields = obj["@ADAsset"]
      let {customer, name, sAMAccountName, description, dNSHostName, updatedOn, propertyFlags} = fields    
      // return {name, sAMAccountName, description, dNSHostName, updatedOn, propertyFlags} 
      if propertyFlags.Some((_, e) => e == "ACCOUNTDISABLE") {
        return null
      }   
      return {
         aggregate:{
           groupBy:{name},
           columns: {
             argmax:{updatedOn, sAMAccountName, description, dNSHostName, propertyFlags, customer} 
         }
       }       
  })
  return {assets}
}

