variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {   //mrss_table
  default = "fims-ame-test1"   
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-ame-lambda-execution-role-test1"   
}

variable "restApiLambdaFunctionName" {
  default = "ame-service-test1"   
}

variable "workerApiLambdaFunctionName" {
  default = "fims-ame-worker-test1"   
}

variable "restApiName" {
  default = "fims-ame-rest-api-test1"   
}

variable "restApiStageName" {
  default = "test1"   
}

variable "serviceName" {
  default = "ame-service"   
}


