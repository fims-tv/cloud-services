variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}
variable "serviceRegistryUrl" {}

variable "repotTableName" {
  default = "fims-job-processor-service-test1"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-job-processor-service-lambda-execution-role-test1"
}

variable "restApiLambdaFunctionName" {
  default = "job-processor-service-test1"
}

variable "restApiLambdaModuleName" {
  default = "job-processor-service"
}

variable "restApiName" {
  default = "fims-job-processor-service-rest-api-test1"
}

variable "restApiStageName" {
  default = "test1"
}

variable "serviceName" {
  default = "job-processor-service"
}
