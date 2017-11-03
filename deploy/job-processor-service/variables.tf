variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}
variable "serviceRegistryUrl" {}

variable "repotTableName" {
  default = "fims-job-processor-service-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-job-processor-service-lambda-execution-role-ibc"
}

variable "restApiLambdaFunctionName" {
  default = "job-processor-service-ibc"
}

variable "restApiLambdaModuleName" {
  default = "job-processor-service"
}

variable "restApiName" {
  default = "fims-job-processor-service-rest-api-ibc"
}

variable "restApiStageName" {
  default = "ibc"
}

variable "serviceName" {
  default = "job-processor-service-ibc"
}
