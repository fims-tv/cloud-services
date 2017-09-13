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
  default = "fims-transform-service-test1"
}

variable "lambdaExecutionRoleName" {
  default = "fims-media-transform-lambda-execution-role-test1"
}

variable "restApiLambdaFunctionName" {
  default = "transform-service-test1"
}

variable "restApiLambdaModuleName" {
  default = "transform-service"
}

variable "workerApiLambdaFunctionName" {
  default = "fims-transform-worker-test1"
}

variable "workerApiLambdaModuleName" {
  default = "lambda-worker"
}

variable "restApiName" {
  default = "fims-transform-rest-api-test1"
}

variable "restApiStageName" {
  default = "test1"
}

variable "serviceName" {
  default = "transform-service"
}
