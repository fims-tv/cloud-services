variable "access_key" { default = "AKIAIEC6B4QTOJQF4R5Q"}
variable "secret_key" { default = "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"}
variable "account_id" { default =  "685412945014"}
variable "region" {default = "us-east-1"}

variable "repotTableName" {   //mrss_table
  default = "fims-transform-service-test1"   
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-transform-lambda-execution-role-test1"   
}

variable "restApiLambdaFunctionName" {
  default = "transform-service-test1"   
}

variable "workerApiLambdaFunctionName" {
  default = "fims-transform-worker-test1"   
}

variable "restApiName" {
  default = "fims-transform-rest-api-test1"   
}

variable "restApiStageName" {
  default = "test1"   
}

variable "serviceName" {
  default = "transform-service"   
}