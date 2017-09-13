variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-media-repo-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-repo-lambda-execution-role-ibc"
}

variable "restApiLambdaFunctionName" {
  default = "media-repo-ibc"
}

variable "restApiLambdaModuleName" {
  default = "media-repository"
}

variable "restApiName" {
  default = "fims-media-repository-rest-api-ibc"
}

variable "restApiStageName" {
  default = "ibc"
}

variable "serviceName" {
  default = "media-repository-ibc"
}
