variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-media-repo-test1"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-repo-lambda-execution-role-test1"
}

variable "restApiLambdaFunctionName" {
  default = "media-repo-test1"
}

variable "restApiLambdaModuleName" {
  default = "media-repository"
}

variable "restApiName" {
  default = "fims-media-repository-rest-api-test1"
}

variable "restApiStageName" {
  default = "test1"
}

variable "serviceName" {
  default = "media-repository"
}
