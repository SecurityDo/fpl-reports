function getS3BucketSize(assetTable) {
  let options = {from: "-48h@d", to: "@d", dimensions: ["BucketName","StorageType"], namespace: "AWS/S3", period: "24h", stat: "Average"}
  let filters = {BucketName:assetTable}
  // let duration = metric("Duration").stat("Sum")
  options.unit = "Byte"
  let size = AWS_GetMetric("BucketSizeBytes", options, filters)
  options.unit = "Count"
  let objCount = AWS_GetMetric("NumberOfObjects", options, filters)
  return {size, objCount}
}

/*
 *  this report list all S3 bucket with byte and object count and daily cost
*/
function main() {
  return AWS_AccountRegionLambda("*", "*",(account, region) => {

    // list all S3 buckets	  
    let buckets = AWS_LoadAsset("s3:bucket", (obj) => {
      let ID = obj.Name
      let Customer = jsonGetAWSTag(obj, "Customer")
      return {ID, Customer}
    })
    if buckets.IsEmpty() {
      return {buckets}
    }

    // get size and object count metric for all buckets	  
    let {size, objCount} = getS3BucketSize(buckets)

    let countTable = objCount.DimensionTable("StorageType","Count","Last")
    let countSummary = countTable.Aggregate("Total_Object_Count", "Count", (ID, col, value, sum) => {
      return sum + value
    }, 0)

    // for every StorageType value, generate one column with the latest value	  
    let bucketTable = size.DimensionTable("StorageType","Byte","Last")

    //let costSummary = bucketTable.Aggregate("Total_Monthly_Cost", "Dollar", (ID, col, value, sum) => {
    //  return sum + AWS_GetPrice("S3", "StorageType", {Size: value, Type: col})
    //}, 0)
    // calculate a daily cost sum for each bucket
    let costSummary = bucketTable.Aggregate("S3_Cost", "Dollar", (ID, col, value, sum) => {
      let monthly = AWS_GetPrice("S3", "StorageType", {Size: value, Type: col})
      return sum + (monthly / 30) 
    }, 0)

    // get a total sum of the size from all storage types	 
    let byteSummary = bucketTable.Aggregate("Total_Bytes", "Byte", (ID, col, value, sum) => {
      return sum + value
     },0)

     // create new summary columns in bucketsTable	  
     bucketTable.Join(byteSummary)
     bucketTable.Join(countSummary)
     bucketTable.Join(costSummary)

    
     bucketTable.NewColumnLambda("AverageSize", "Byte", (row) => row.Total_Bytes / row.Total_Object_Count)
     bucketTable.Join(buckets)

     return {bucketTable}
  })
 
}

