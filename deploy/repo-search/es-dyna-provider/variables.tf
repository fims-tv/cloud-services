variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "sourceTableName" {}

variable "triggerLambdaFunctionName" {}

variable "triggerLambdaRoleArn" {}

variable "triggerLambdaModuleName" {
  default = "dynamo-to-elasticsearch"
}

variable "dynamoDBStreamArn" {}

variable "esEndpoint" {}

variable "esDomainid" {}




