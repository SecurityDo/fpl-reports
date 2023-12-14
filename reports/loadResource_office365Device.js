/**
 * Main method. This method is a skeleton method of loading Office365 devices. 
 *  
 * @returns {object} - Returns an object containing all the tables/metric/alert obtained from the queries
 */
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

