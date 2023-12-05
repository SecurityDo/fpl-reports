function main() {

  let devices = Fluency_ResourceLoad("fehx", "device", "*", (obj, customer) => {
      let fields = obj["@FEHxDevice"]
      let {_id:uuid, agent_version, hostname,last_poll_ip,last_poll_timestamp,primary_ip_address} = fields
      let osName= fields.os.product_name
      // return {uuid, agent_version, hostname,last_poll_ip,last_poll_timestamp,primary_ip_address, osName, customer}
      return {
        aggregate:{
          groupBy:{hostname},
          columns: {argmax:{last_poll_timestamp, uuid, agent_version, hostname,last_poll_ip,primary_ip_address, osName, customer}, 
		   count:{nameCount:true}}
        }
      }  
  })
  devices.Sort(-1, "nameCount")
  return {devices}
}
