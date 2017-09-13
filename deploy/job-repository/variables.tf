variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-job-repository-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-job-repository-lambda-execution-role-ibc"
}

variable "restApiLambdaFunctionName" {
  default = "job-repository-ibc"
}

variable "restApiLambdaModuleName" {
  default = "job-repository"
}

variable "restApiName" {
  default = "fims-job-repository-rest-api-ibc"
}

variable "restApiStageName" {
  default = "ibc"
}

variable "serviceName" {
  default = "job-repository-ibc"
}
