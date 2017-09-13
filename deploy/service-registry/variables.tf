variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-service-registry-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-service-registry-lambda-execution-role-ibc"
}

variable "restApiLambdaFunctionName" {
  default = "service-registry-ibc"
}

variable "restApiLambdaModuleName" {
  default = "service-registry"
}

variable "restApiName" {
  default = "fims-service-registry-rest-api-ibc"
}

variable "restApiStageName" {
  default = "ibc"
}

variable "serviceName" {
  default = "service-registry-ibc"
}
