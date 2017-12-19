variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}
variable "serviceRegistryUrl" {}

variable "restApiLambdaModuleName" {
  default = "job-processor-service"
}

variable "serviceName" {}

variable "environmentName" {}

variable "environmentType" {}