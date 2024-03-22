// this lambda is applied to a mgmt queue data sink
// group incoming events based on "@tenant" field and send them
// to different redis queues
({obj}) => {
	let tenant =  obj["@tenant"]
	return {
	   group: tenant, 
	   meta:{ 
             tenant, 
	     queue:"platform_eventwatch_tenant_" + tenant
	   }
	}
}
