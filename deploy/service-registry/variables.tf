variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-service-registry-test1"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-service-registry-lambda-execution-role-test1"
}

variable "restApiLambdaFunctionName" {
  default = "service-registry-test1"
}

variable "restApiLambdaModuleName" {
  default = "service-registry"
}

variable "restApiName" {
  default = "fims-service-registry-rest-api-test1"
}

variable "restApiStageName" {
  default = "test1"
}

variable "serviceName" {
  default = "service-registry"
}
