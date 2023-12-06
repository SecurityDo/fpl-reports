function main() {

  let hosts = Fluency_ResourceLoad("Qualys", "host", "*", (obj, customer) => {
      let fields = obj["@qualysHost"]
      let {domain, address, netbiosName, os, created, agentVersion:qualysAgentVersion, location} = fields       
      return {
         aggregate:{
           groupBy:{netbiosName},
           columns: {argmax:{created, domain, address, netbiosName, os, qualysAgentVersion, location}, count:{nameCount:true}}
         }
       } 
       
  })
  hosts.Sort(-1, "nameCount")
  return {hosts}
}
