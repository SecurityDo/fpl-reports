function main() {
  let a = fluencyResourceLoad("default", "sentineloneagent", (obj) => {
    let fields = obj["@sentinelOneAgent"]
    let {id:ID, computerName} = fields
    return {ID, computerName}
  })
  return {a}
}
