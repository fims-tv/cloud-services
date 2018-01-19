variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}



variable "restApiLambdaModuleName" {
  default = "ai-service"
}

variable "workerApiLambdaModuleName" {
  default = "lambda-worker"
}

variable "workerResultApiLambdaModuleName" {
  default = "lambda-worker-result"
}


variable "serviceName" {}

variable "environmentName" {}

variable "environmentType" {}
