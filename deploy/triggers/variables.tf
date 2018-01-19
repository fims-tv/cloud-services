variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}
variable "serviceRegistryUrl" {}

variable "lambdaExecutionRoleName" {
  default = "fims-workflow-lambda-execution-role"
}



variable "serviceName" {}

variable "environmentName" {}

variable "environmentType" {}


# S3 buckets

variable "public-ingest-bucket" {}
variable "repo-bucket" {}

# Lambda used in workflow

# Module names for lamdba  

variable "triggerAIServiceLambdaModuleName" {
  default = "trigger-ai-service"
}


