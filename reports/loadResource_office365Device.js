function main() {

  let assets = Fluency_ResourceLoad("Office365", "device", "*", (obj, customer) => {
      let fields = obj["@office365Device"]
      let {displayName: name, registrationDateTime:updatedOn, enrollmentProfileName, approximateLastSignInDateTime, accountEnabled, operatingSystem, enrollmentType} = fields
      
      if (!accountEnabled) {
        return null
      }
            
      // return {name, registrationDateTime, enrollmentProfileName, approximateLastSignInDateTime, accountEnabled, operatingSystem, enrollmentType}          
      let normalize = tolower(name)
      
      return {
         aggregate:{
           groupBy:{normalize},
           columns: {
             argmax:{updatedOn},
             values:{customers: enrollmentProfileName}
           }
         }
      }          
  })
  return {assets}
}

