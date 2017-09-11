variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "lambdaExecutionRoleName" {
  default = "fims-workflow-lambda-execution-role"
}

# S3 buckets

variable "public-ingest-bucket" {
  default = "fims-public-ingest"
}

variable "repo-bucket" {
  default = "fims-private-repo"
}

# Lambda used in workflow

# Initial Step
variable "triggerWorkflowLambdaFunctionName" {
  default = "fims-workflow-trigger-workflow-from-lambda"
}

variable "triggerWorkflowLambdaModuleName" {
  default = "trigger-workflow-from-lambda"
}

# Step 1
variable "validateMetadataFunctionName" {
  default = "fims-workflow-validate-metadata"
}

variable "validateMetadataModuleName" {
  default = "validate-metadata"
}

# Step 2
variable "copyEssenceToPrivateBucketFunctionName" {
  default = "fims-workflow-copy-essence-to-private-bucket"
}

variable "copyEssenceToPrivateBucketModuleName" {
  default = "copy-essence-to-private-bucket"
}

# Step 3
variable "removeEssenceFromPublicBucketFunctionName" {
  default = "fims-workflow-remove-essence-from-public-bucket"
}

variable "removeEssenceFromPublicBucketModuleName" {
  default = "remove-essence-from-public-bucket"
}
