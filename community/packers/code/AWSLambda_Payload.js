// Data input format: ({ events, meta }) 
function main({events, meta}) {
    //
    let record = {
       events
    }

    let s = toString(record)
    let gz = gzipCompress(s)
    
    let payload = {
       awslogs: {
         data: base64Encode(gz)  
       }
    }
    return {
      "status":"pass",
      "data":toString(payload)
    }
}

