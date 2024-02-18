const fs = require('fs')

fs.readFile('fpl1.txt', 'utf8', function (err, data) {
  if (err) throw err
  const fpl2Code = convert(data)
  fs.writeFile('fpl2.txt', fpl2Code, (err) => {
    if (err) throw err
    console.log('The file has been saved!')
  })
})

// helper function to convert the fpl1 string into a fpl2 string
function convert (str) {
  // gets all the env variables and default values
  let env = str.match(/env.*/g)
  const envFields = []
  const envValues = []
  if (env) {
    env = env[0].replace('env', '')
    for (const envField of env.split(',')) {
      const fieldName = envField.split('=')[0].trim()
      const fieldValue = envField.split('=')[1].trim()

      if (fieldValue.startsWith('__')) {
        const regex = new RegExp('(argument\\s+' + fieldValue + '.*)', 'g')
        const field__value = str.match(regex)[0].split(/\s+/g)[2]
        envFields.push(fieldName)
        envValues.push(field__value)
      } else {
        envFields.push(fieldName)
        envValues.push(fieldValue)
      }
    }
  }

  // START OF MAIN FUNCTION
  let newStr = 'function main({'
  // add all the env variables into the main function
  for (const i in envFields) {
    newStr += envFields[i] + '=' + envValues[i] + ','
  }
  if (envFields.length > 0) {
    newStr = newStr.slice(0, -1)
    newStr += '}) {\n'
  } else {
    newStr = newStr.slice(0, -1)
    newStr += ') {\n'
  }

  // extract all function calls from the query
  const fpl2Functions = []
  const tableNames = []
  const functions = str.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9,])*\)\s*\{[\s\S]*?\}\n/g)
  for (const func of functions) {
    const query = func[0]
    fpl2Functions.push(query)
  }
  const functionsEnd = str.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9,])*\)\s+[\s\S]*?end\n/g)
  for (const func of functionsEnd) {
    const query = func[0]
    fpl2Functions.push(query)
  }

  // extract all the stream calls from the query
  const streams = str.matchAll(/stream [A-Za-z0-9_ ]+=[A-Za-z0-9_ ]+\(([a-zA-Z0-9])*\)/g)
  for (const stream of streams) {
    const query = stream[0].split('=')
    const tableName = query[0].replace('stream ', '').trim()
    let functionCall = query[1]
    // check if env variables from and to are used
    if (envFields.includes('from') && envFields.includes('to')) {
      if (functionCall.includes('()')) {
        functionCall = functionCall.replace('()', '(from,to)').trim()
      } else {
        functionCall = functionCall.replace(')', ',from,to)').trim()
      }
    }
    tableNames.push(tableName)
    newStr += '\tlet ' + tableName + ' = ' + functionCall + '\n'
  }

  // extract all use export calls from the query
  const useExports = str.matchAll(/use\s+([a-zA-Z0-9_]+)\s*[\s\S]*?export\s+([a-zA-Z0-9_]+)/g)
  for (const uses of useExports) {
    let query = ''
    const lines = uses[0].split('\n')
    for (const line of lines) {
      // handling use and export statements
      if (line.startsWith('use')) {
        query = line.replace('use', '=')
      } else if (line.startsWith('export')) {
        tableNames.push(line.replace('export', '').trim())
        query = line.replace('export', 'let') + query
      }

      // handling fpl2 function calls
      if (line.startsWith('sort')) {
        const temp = line.split(/\s+/)
        if (temp.length === 2) {
          query += '.Sort(0, "' + temp[1] + '")'
        } else {
          query += '.Sort(' + temp[1] + ', "' + temp[2] + '")'
        }
      }
      if (line.startsWith('aggregate')) {
        // remove aggregate and by statements
        let temp = line.replace('aggregate', '')
        temp = temp.split(' by ')[0]
        const byArg = temp.split(' by ')[1]
        let byStatement = ''
        if (byArg) {
          byStatement = '\t\t\tgroupBy: {' + byArg + '},\n'
        }

        // split the different aggregation methods
        temp = temp.split(/,\s*/)

        const fields = []
        let columns = '\t\t\tcolumns: {\n'
        for (const arg of temp) {
          const params = arg.trim().split('=')
          const varName = params[0]
          const method = params[1].split('(')[0]
          const field = params[1].split('(')[1].replace(')', '')
          fields.push(field)
          columns += '\t\t\t\t' + method + ': {' + varName + ': ' + field + '},\n' 
        }
        columns = columns.slice(0, -2)
        columns += '\n\t\t\t}\n'
        query += '.Aggregate(({' + fields + '}) => {\n' + '\t\treturn {\n' + byStatement + columns + '\t\t}\n' + '\t})'
      }
      if (line.startsWith('join')) {
        let temp = line.replace('join', '')
        temp = temp.split(' on ')
        const joinField = temp[1].trim()
        const joinTable = temp[0].trim()
        query += '.Join(' + joinTable + ', ({' + joinField + '}) => "inner")'
      }
      if (line.startsWith('let')) {
        let temp = line.replace('let', '')
        temp = temp.split('=')
        const rowName = temp[0].trim()
        let rowValues = temp[1]
        const rowValuesStr = rowValues.matchAll(/([a-zA-Z][a-zA-Z0-9_]*)/g)
        for (const rowValueStr of rowValuesStr) {
          rowValues = rowValues.replace(rowValueStr[0], 'row.' + rowValueStr[0])
        }
        query += '.NewColumnLambda("' + rowName + '", "", ' + '({row}) => ' + rowValues + ')'
      }
    }
    newStr += '\t' + query + '\n'
  }

  // add return statement for each table in the end
  newStr += '\n\treturn {'
  for (const tableName of tableNames) {
    newStr += '\n\t\t' + tableName + ','
  }
  // remove last comma and add closing bracket
  newStr = newStr.slice(0, -1)
  newStr += '\n\t}\n'

  newStr += '}'

  // END OF MAIN FUNCTION

  // add all function definitions at the bottom of the file
  for (const func of fpl2Functions) {
    const funcName = func.match(/function\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9,])*\)/g)[0]
    let template = funcName
    let arguments = []
    if (funcName.match(/function\s+([a-zA-Z0-9_]+)\s*\(\)/g)) {
      if (envFields.includes('from') && envFields.includes('to')) {
        template = template.replace('()', '(from, to) {\n')
        template += '\tlet env = {from, to}\n'
      } else {
        template = template.replace('()', '() {\n')
      }
    } else {
      if (envFields.includes('from') && envFields.includes('to')) {
        const args = funcName.split('(')[1].split(')')[0]
        arguments = args.split(',')
        template = template.replace(')', ',from,to) {\n')
        template += '\tlet env = {' + args + ',from, to}\n'
      } else {
        const args = funcName.split('(')[1].split(')')[0]
        arguments = args.split(',')
        template = template.replace(')', ') {\n')
        template += '\tlet env = {' + args + '}\n'
      }
    }
    template += '\tlet fplTemplate = `'
    let fplTemplate = ''
    // convert template into template with lavadbfpl call
    if (func.match(/function\s+([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9,])*\)\s*\{[\s\S]*?\}\n/g)) {
      const lines = func.split('\n')
      for (const line of lines) {
        if (line.startsWith('function') || line.startsWith('}')) {
          continue
        } else {
          fplTemplate +='\n' + line 
        }
      }
    } else {
      const lines = func.split('\n')
      for (const line of lines) {
        if (line.startsWith('function') || line.startsWith('end')) {
          continue
        } else {
          fplTemplate +='\n' + line 
        }
      }
    }

    // convert all arguments into env variables
    for (const arg of arguments) {
      const argVal = arg.trim()
      const regex = new RegExp('(' + argVal + '\\b)', 'g')
      fplTemplate = fplTemplate.replaceAll(regex, '"{{.' + argVal + '}}"')
    }

    // add fplTemplate into the template
    template += fplTemplate

    // add search env into the template and close template with
    template += '\t`\n'
    if (envFields.includes('from') && envFields.includes('to')) {
      template = template.replace('search ', 'search {from="{{.from}}", to="{{.to}}"} ')
      template += '\treturn fluencyLavadbFpl(template(fplTemplate, env))\n'
    } else if (arguments.length > 0) {
      template += '\treturn fluencyLavadbFpl(template(fplTemplate, env))\n'
    } else {
      template += '\treturn fluencyLavadbFpl(fplTemplate)\n'
    }
    template += '}'
    newStr += '\n\n' + template
  }
  return newStr
}