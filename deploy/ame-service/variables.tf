variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-ame-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-ame-lambda-execution-role-ibc"
}

variable "restApiLambdaFunctionName" {
  default = "ame-service-ibc"
}

variable "restApiLambdaModuleName" {
  default = "ame-service"
}

variable "workerApiLambdaFunctionName" {
  default = "fims-ame-worker-ibc"
}

variable "workerApiLambdaModuleName" {
  default = "lambda-worker"
}

variable "restApiName" {
  default = "fims-ame-rest-api-ibc"
}

variable "restApiStageName" {
  default = "ibc"
}

variable "serviceName" {
  default = "ame-service-ibc"
}
