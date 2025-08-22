// Description:
// Default metaflow event passthrough
// set data source format to "text" 
function main(doc) {

    // skip non-json meta line
    if !startsWith(doc.text, "{") {
      return "abort"
    }
    obj = parseJson(doc.text)
    obj["@type"] = "metaflow"
    doc.obj = obj
    return "pass"
}

