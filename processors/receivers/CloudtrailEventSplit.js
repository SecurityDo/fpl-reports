// Data input format: {raw} or {line}, or {doc}
function main({obj}) {
  let records = obj.Records
  if !records {
    throw "no Records field"
  }
  let list = []
  for i, record = range records {
    list = append(list, record)
  }
  return list
}

