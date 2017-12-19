variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "restApiLambdaModuleName" {
  default = "transform-service"
}

variable "workerApiLambdaModuleName" {
  default = "lambda-worker"
}

variable "serviceName" {}

variable "environmentName" {}

variable "environmentType" {}