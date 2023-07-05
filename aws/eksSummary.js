function main() {
  return  AWS_AccountRegionLambda("*", "*", () => {
    let clusters = AWS_LoadAsset("eks:cluster", (obj) => {
        let {Name:ID, Status} = obj
        // NOTE the Tags format is differ from other AWS service. So we can't use jsonGetAWSTag() 
        let Stack = obj.Tags["aws:cloudformation:stack-name"]
        return {ID, Status, Stack}
    })
    let nodegroups = AWS_LoadAsset("eks:nodegroup", (obj) => {
        let {NodegroupName:ID, Status, ClusterName} = obj
        let Type = obj.Tags["alpha.eksctl.io/nodegroup-type"]
        return {ID,ClusterName, Status, Type}
    })

    let options = {from: "-1h@m", to: "@m", dimensions: ["ClusterName", "NodeName", "InstanceId"], namespace: "ContainerInsights", period: "1m", stat: "Average"}
    let filters = {ClusterName: clusters}

    let nodeCpu = AWS_GetMetric("node_cpu_utilization", options, filters)

    options.dimensions =  ["ClusterName", "Namespace", "PodName"]
    let podCpu =  AWS_GetMetric("pod_cpu_utilization", options, filters)

    return {clusters, nodegroups, nodeCpu, podCpu}
  })
}

