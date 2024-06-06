// Data input format: ({ raw }). Target "raw"
function main({raw}) {
    let lines = split(raw, "\n")
    let list = []
    let colMap = {}
    let intFieldMap ={
      "bytes": true,
      "packets": true,
      "srcport": true,
      "dstport": true,
      "start": true,
      "end": true
    }
    for i, line = range lines {
      if (i == 0) {
        parseHeader(line, colMap)
        continue
      }
      // printf("%s", line)
      // printf("%v", colMap)
      let record = {}
      let fields = split(line," ")
      for i, field = range fields {
         let column = colMap[toString(i)]
         if (column) {
           if intFieldMap[column] {
             record[column] = parseInt(field)
           } else {
             record[column] = field
           }
           
         }
      }
      list = append(list, {"@vpcflows":record})
      // printf("%v", record)
    }
    return list
}

function parseHeader(header, colMap) {
   let columns = split(header," ")
   for i, column = range columns {
     colMap[toString(i)] = column
   } 
}

