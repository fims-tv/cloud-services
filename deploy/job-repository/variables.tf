variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-job-repository-test1"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-job-repository-lambda-execution-role-test1"
}

variable "restApiLambdaFunctionName" {
  default = "job-repository-test1"
}

variable "restApiLambdaModuleName" {
  default = "job-repository"
}

variable "restApiName" {
  default = "fims-job-repository-rest-api-test1"
}

variable "restApiStageName" {
  default = "test1"
}

variable "serviceName" {
  default = "job-repository"
}
