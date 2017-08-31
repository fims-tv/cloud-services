variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "repotTableName" {
  default = "fims-ame-test1" //mrss_table
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-ame-lambda-execution-role-test1"
}

variable "restApiLambdaFunctionName" {
  default = "ame-service-test1"
}

variable "restApiLambdaModuleName" {
  default = "ame-service"
}

variable "workerApiLambdaFunctionName" {
  default = "fims-ame-worker-test1"
}

variable "workerApiLambdaModuleName" {
  default = "lambda-worker"
}

variable "restApiName" {
  default = "fims-ame-rest-api-test1"
}

variable "restApiStageName" {
  default = "test1"
}

variable "serviceName" {
  default = "ame-service"
}
