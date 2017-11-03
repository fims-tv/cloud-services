variable "access_key" {
  default = ""
}

variable "secret_key" {
  default = ""
}

variable "account_id" {
  default = ""
}

variable "region" {
  default = "us-east-1"
}

variable "repotTableName" {
  default = "fims-transform-service-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-transform-lambda-execution-role-ibc"
}

variable "restApiLambdaFunctionName" {
  default = "transform-service-ibc"
}

variable "restApiLambdaModuleName" {
  default = "transform-service"
}

variable "workerApiLambdaFunctionName" {
  default = "fims-transform-worker-ibc"
}

variable "workerApiLambdaModuleName" {
  default = "lambda-worker"
}

variable "restApiName" {
  default = "fims-transform-rest-api-ibc"
}

variable "restApiStageName" {
  default = "ibc"
}

variable "serviceName" {
  default = "transform-service"
}
