/**
 * Main method. This method is a skeleton method of loading AD assets. 
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
function main() {
  let assets = Fluency_ResourceLoad("AD", "asset", "*", (obj, customer) => {
      let fields = obj["@ADAsset"]
      let {customer, name, sAMAccountName, description, dNSHostName, updatedOn, propertyFlags} = fields    
      // return {name, sAMAccountName, description, dNSHostName, updatedOn, propertyFlags} 
      if (propertyFlags.Some((_, e) => e == "ACCOUNTDISABLE")) {
        return null
      }   
      return {
         aggregate:{
           groupBy:{name},
           columns: {
             argmax:{updatedOn, sAMAccountName, description, dNSHostName, propertyFlags, customer} 
         }
       }   
      }    
  })
  return {assets}
}

