// events is a list of json object
// meta is a map of properties
// data is a blob or string for PutRecord API
// partitionKey will be set to a random number is not set
function main({events, meta}) {
    let record = {
       logEvents:events
    }
    let s = toString(record)
    // printf("%s",s)    
    return {
      "status":"pass",
      "data":gzipCompress(s)
      // "partitionKey":""
    }
}

