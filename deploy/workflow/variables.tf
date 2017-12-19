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

variable "triggerWorkflowLambdaModuleName" {
  default = "trigger-workflow-from-lambda"
}

# Step 1
variable "validateMetadataModuleName" {
  default = "validate-metadata"
}

# Step 2
variable "copyEssenceToPrivateBucketModuleName" {
  default = "copy-essence-to-private-bucket"
}

# Step 3
variable "removeEssenceFromPublicBucketModuleName" {
  default = "remove-essence-from-public-bucket"
}

# Step 4
variable "createAmeJobModuleName" {
  default = "create-ame-job"
}

# Step 5
variable "createAssetInMediaRepoModuleName" {
  default = "create-asset-in-media-repo"
}

# Step 6
variable "createTransformJobExtractThumbnailModuleName" {
  default = "create-transform-job-extract-thumbnail"
}

# Step 7
variable "createTransformJobCreateProxyModuleName" {
  default = "create-transform-job-create-proxy"
}

# Step 8
variable "updateAssetInMediaRepoModuleName" {
  default = "update-asset-in-media-repo"
}

# Step 9
variable "createAssetInSemanticRepoModuleName" {
  default = "create-asset-in-semantic-repo"
}

# Call back for workflow activity

variable "sendCallbackToWFActivityModuleName" {
  default = "send-callback-to-wf-activity"
}

