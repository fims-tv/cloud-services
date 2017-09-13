variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}
variable "serviceRegistryUrl" {}

variable "lambdaExecutionRoleName" {
  default = "fims-workflow-lambda-execution-role"
}

# S3 buckets

variable "public-ingest-bucket" {}
variable "repo-bucket" {}

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

# Step 4
variable "createAmeJobFunctionName" {
  default = "fims-workflow-create-ame-job"
}

variable "createAmeJobModuleName" {
  default = "create-ame-job"
}

# Step 5
variable "createAssetInMediaRepoFunctionName" {
  default = "fims-workflow-create-asset-in-media-repo"
}

variable "createAssetInMediaRepoModuleName" {
  default = "create-asset-in-media-repo"
}

# Step 6
variable "createTransformJobExtractThumbnailFunctionName" {
  default = "fims-workflow-create-transform-job-extract-thumbnail"
}

variable "createTransformJobExtractThumbnailModuleName" {
  default = "create-transform-job-extract-thumbnail"
}

# Step 7
variable "createTransformJobCreateProxyFunctionName" {
  default = "fims-workflow-create-transform-job-create-proxy"
}

variable "createTransformJobCreateProxyModuleName" {
  default = "create-transform-job-create-proxy"
}

# Step 8
variable "updateAssetInMediaRepoFunctionName" {
  default = "fims-workflow-update-asset-in-media-repo"
}

variable "updateAssetInMediaRepoModuleName" {
  default = "update-asset-in-media-repo"
}

# Step 9
variable "createAssetInSemanticRepoFunctionName" {
  default = "fims-workflow-create-semantic-in-media-repo"
}

variable "createAssetInSemanticRepoModuleName" {
  default = "create-asset-in-semantic-repo"
}


# Call back for workflow activity

variable "lambdaWorkflowActivityExecutionRoleName" {
  default = "fims-workflow-activity-lambda-execution-role"
}

variable "jobCompletionActivity" {
  default = "FIMS-Job-Completion-Activity"
}

variable "sendCallbackToWFActivityFunctionName" {
  default = "fims-workflow-send-callback-to-wf-activity"
}

variable "sendCallbackToWFActivityModuleName" {
  default = "send-callback-to-wf-activity"
}

variable "jobCompletionRestAPIName" {
  default = "FIMS-Job-Completion-Activity"
}

variable "jobCompletionAPIStageName" {
  default = "test"
}
