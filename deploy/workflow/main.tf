provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.region}"
}

#################################
#  aws_iam_role : iam_for_exec_lambda
#################################

resource "aws_iam_role" "iam_for_exec_lambda" {
  name = "${var.lambdaExecutionRoleName}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.triggerWorkflowFromLambda.arn}"
  principal     = "s3.amazonaws.com"
  source_arn    = "${aws_s3_bucket.public-ingest-bucket.arn}"
}

resource "aws_iam_policy" "log_policy" {
  name        = "log_policy"
  description = "Policy to write to log"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:*"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role-policy-log" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "${aws_iam_policy.log_policy.arn}"
}

resource "aws_iam_policy" "steps_policy" {
  name        = "steps_policy"
  description = "Policy to execute Step Function"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "states:*",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role-policy-steps" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "${aws_iam_policy.steps_policy.arn}"
}

resource "aws_iam_policy" "S3_policy" {
  name        = "S3_policy"
  description = "Policy to access S3 bucket objects"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "S3:*",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role-policy-S3" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "${aws_iam_policy.S3_policy.arn}"
}

#################################
#  Lambda : triggerWorkflowFromLambda
#################################

resource "aws_lambda_function" "triggerWorkflowFromLambda" {
  filename         = "./../workflow/trigger-workflow-from-lambda/build/trigger-workflow-from-lambda-package.zip"
  function_name    = "${var.triggerWorkflowLambdaFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.triggerWorkflowLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/trigger-workflow-from-lambda/build/trigger-workflow-from-lambda-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "15"
  memory_size      = "128"

  environment {
    variables = {
      STATE_MACHINE_ARN = "${aws_sfn_state_machine.stepWorkflow.id}"
    }
  }
}

#################################
#  Lambda : Step 1 Validate metadata
#################################

resource "aws_lambda_function" "validateMetadata" {
  filename         = "./../workflow/validate-metadata/build/workflow-validate-metadata-package.zip"
  function_name    = "${var.validateMetadataFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.validateMetadataModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/validate-metadata/build/workflow-validate-metadata-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"
}

#################################
#  Lambda : Step 2 copy-essence-to-private-bucket
#################################

resource "aws_lambda_function" "copyEssenceToPrivateBucket" {
  filename         = "./../workflow/copy-essence-to-private-bucket/build/workflow-copy-essence-to-private-bucket-package.zip"
  function_name    = "${var.copyEssenceToPrivateBucketFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.copyEssenceToPrivateBucketModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/copy-essence-to-private-bucket/build/workflow-copy-essence-to-private-bucket-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      DEST_BUCKET      = "${var.repo-bucket}"
      DEST_BUCKET_PATH = "https://s3.amazonaws.com/${var.repo-bucket}/"
    }
  }
}

#################################
#  Lambda : Step 3 Remove essence from public bucket
#################################

resource "aws_lambda_function" "removeEssenceFromPublicBucket" {
  filename         = "./../workflow/remove-essence-from-public-bucket/build/workflow-remove-essence-from-public-bucket-package.zip"
  function_name    = "${var.removeEssenceFromPublicBucketFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.removeEssenceFromPublicBucketModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/remove-essence-from-public-bucket/build/workflow-remove-essence-from-public-bucket-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"
}

#################################
#  Lambda : Step 4 Create AME Job
#################################

resource "aws_lambda_function" "createAmeJob" {
  filename         = "./../workflow/create-ame-job/build/create-ame-job-package.zip"
  function_name    = "${var.createAmeJobFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.createAmeJobModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/create-ame-job/build/create-ame-job-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      SERVICE_REGISTRY_URL     = "${var.serviceRegistryUrl}"
      JOB_OUTPUT_BUCKET        = "${var.repo-bucket}"
      JOB_OUTPUT_KEY_PREFIX    = "ame-service-output/"
      JOB_SUCCESS_URL          = "${aws_api_gateway_deployment.job_activity_completion_deployment.invoke_url}/success?tasktoken="
      JOB_FAILED_URL           = "${aws_api_gateway_deployment.job_activity_completion_deployment.invoke_url}/fail?tasktoken="
      JOB_PROCESS_ACTIVITY_ARN = "${aws_sfn_activity.job_completion_activity.id}"
    }
  }
}

#################################
#  Lambda : Step 5 Create Asset in Media Repo
#################################

resource "aws_lambda_function" "createAssetInMediaRepo" {
  filename         = "./../workflow/create-asset-in-media-repo/build/create-asset-in-media-repo-package.zip"
  function_name    = "${var.createAssetInMediaRepoFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.createAssetInMediaRepoModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/create-asset-in-media-repo/build/create-asset-in-media-repo-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      SERVICE_REGISTRY_URL = "${var.serviceRegistryUrl}"
    }
  }
}

###########################################################
#  Lambda : Step 6 Create Transform Job - Extract Thumbnail
###########################################################

resource "aws_lambda_function" "createTransformJobExtractThumbnail" {
  filename         = "./../workflow/create-transform-job-extract-thumbnail/build/create-transform-job-extract-thumbnail-package.zip"
  function_name    = "${var.createTransformJobExtractThumbnailFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.createTransformJobExtractThumbnailModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/create-transform-job-extract-thumbnail/build/create-transform-job-extract-thumbnail-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      SERVICE_REGISTRY_URL     = "${var.serviceRegistryUrl}"
      JOB_OUTPUT_BUCKET        = "${var.repo-bucket}"
      JOB_OUTPUT_KEY_PREFIX    = "transform-service-output/"
      JOB_SUCCESS_URL          = "${aws_api_gateway_deployment.job_activity_completion_deployment.invoke_url}/success?tasktoken="
      JOB_FAILED_URL           = "${aws_api_gateway_deployment.job_activity_completion_deployment.invoke_url}/fail?tasktoken="
      JOB_PROCESS_ACTIVITY_ARN = "${aws_sfn_activity.job_completion_activity.id}"
    }
  }
}

###########################################################
#  Lambda : Step 7 Create Transform Job - Create Proxy
###########################################################

resource "aws_lambda_function" "createTransformJobCreateProxy" {
  filename         = "./../workflow/create-transform-job-create-proxy/build/create-transform-job-create-proxy-package.zip"
  function_name    = "${var.createTransformJobCreateProxyFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.createTransformJobCreateProxyModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/create-transform-job-create-proxy/build/create-transform-job-create-proxy-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      SERVICE_REGISTRY_URL     = "${var.serviceRegistryUrl}"
      JOB_OUTPUT_BUCKET        = "${var.repo-bucket}"
      JOB_OUTPUT_KEY_PREFIX    = "transform-service-output/"
      JOB_SUCCESS_URL          = "${aws_api_gateway_deployment.job_activity_completion_deployment.invoke_url}/success?tasktoken="
      JOB_FAILED_URL           = "${aws_api_gateway_deployment.job_activity_completion_deployment.invoke_url}/fail?tasktoken="
      JOB_PROCESS_ACTIVITY_ARN = "${aws_sfn_activity.job_completion_activity.id}"
    }
  }
}

###########################################################
#  Lambda : Step 8 Update Asset in Media Repo
###########################################################

resource "aws_lambda_function" "updateAssetInMediaRepo" {
  filename         = "./../workflow/update-asset-in-media-repo/build/update-asset-in-media-repo-package.zip"
  function_name    = "${var.updateAssetInMediaRepoFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.updateAssetInMediaRepoModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/update-asset-in-media-repo/build/update-asset-in-media-repo-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      SERVICE_REGISTRY_URL = "${var.serviceRegistryUrl}"
    }
  }
}

###########################################################
#  Lambda : Step 9 Create Asset in Semantic Repo
###########################################################

resource "aws_lambda_function" "createAssetInSemanticRepo" {
  filename         = "./../workflow/create-asset-in-semantic-repo/build/create-asset-in-semantic-repo-package.zip"
  function_name    = "${var.createAssetInSemanticRepoFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.createAssetInSemanticRepoModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/create-asset-in-semantic-repo/build/create-asset-in-semantic-repo-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "30"
  memory_size      = "256"

  environment {
    variables = {
      SERVICE_REGISTRY_URL = "${var.serviceRegistryUrl}"
    }
  }
}

#################################
#  aws_iam_role : IAM role for state machine executions
#################################

resource "aws_iam_role" "iam_for_state_machine_execution" {
  name = "iam_for_state_machine_execution"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "states.${var.region}.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_policy" "steps_policy2" {
  name        = "steps_policy2"
  description = "Policy to execute Step Function"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:InvokeFunction"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role-policy-steps2" {
  role       = "${aws_iam_role.iam_for_state_machine_execution.name}"
  policy_arn = "${aws_iam_policy.steps_policy2.arn}"
}

#################################
#  Step Functions : FeedIngestWorkflow
#################################

resource "aws_sfn_state_machine" "stepWorkflow" {
  name     = "${var.stepWorkflowName}"
  role_arn = "${aws_iam_role.iam_for_state_machine_execution.arn}"

  definition = <<EOF
{
  "Comment": "FIMS DEMO IBC",
  "StartAt": "ValidateMetadata",
  "States": {
    "ValidateMetadata": {
      "Type": "Task",
          "Resource": "${aws_lambda_function.validateMetadata.arn}",
      "Next": "CopyEssenceToPrivateBucket"
    },
    "CopyEssenceToPrivateBucket": {
      "Type": "Task",
      "Resource": "${aws_lambda_function.copyEssenceToPrivateBucket.arn}",
      "Next": "RemoveIngestFromPublicBucket"
    },
    "RemoveIngestFromPublicBucket": {
      "Type": "Task",
      "Resource": "${aws_lambda_function.removeEssenceFromPublicBucket.arn}",
      "Next": "AME-Job"
    },
    "AME-Job": {
      "Type": "Parallel",
      "Next": "CreateAssetInMediaRepo",
      "Branches": [{
          "Comment": "awaits Job Completion API to state workflow",
          "StartAt": "Monitor-AME-Job",
          "States": {
            "Monitor-AME-Job": {
              "Type": "Task",
              "Resource": "${aws_sfn_activity.job_completion_activity.id}",
              "TimeoutSeconds": 3600,
              "HeartbeatSeconds": 1800,
              "End": true
            }
          }
        }, {
          "StartAt": "Prepare-AME-Job",
          "States": {
            "Prepare-AME-Job": {
              "Comment": "Wait Step as the ProcessJob Activity needs to be available before the CreateJob step is executed",
              "Type": "Wait",
              "Seconds": 1,
              "Next": "Submit-AME-Job"
            },
            "Submit-AME-Job": {
              "Comment": "Task responsible to create the job, it uses the AWS Step Function SDK to get the token of the Process Job Activity",
              "Type": "Task",
              "Resource": "${aws_lambda_function.createAmeJob.arn}",
              "End": true
            }
          }
        }
      ]
    },
    "CreateAssetInMediaRepo": {
      "Type": "Task",
      "Resource": "${aws_lambda_function.createAssetInMediaRepo.arn}",
      "Next": "Transform-Job-Extract-Thumbnail"
    },
    "Transform-Job-Extract-Thumbnail": {
      "Type": "Parallel",
      "Next": "Transform-Job-Create-Proxy",
      "Branches": [{
          "Comment": "awaits Job Completion API to state workflow",
          "StartAt": "Monitor-Transform-Job-Extract-Thumbnail",
          "States": {
            "Monitor-Transform-Job-Extract-Thumbnail": {
              "Type": "Task",
              "Resource": "${aws_sfn_activity.job_completion_activity.id}",
              "TimeoutSeconds": 3600,
              "HeartbeatSeconds": 1800,
              "End": true
            }
          }
        }, {
          "StartAt": "Prepare-Transform-Job-Extract-Thumbnail",
          "States": {
            "Prepare-Transform-Job-Extract-Thumbnail": {
              "Comment": "Wait Step as the ProcessJob Activity needs to be available before the CreateJob step is executed",
              "Type": "Wait",
              "Seconds": 1,
              "Next": "Submit-Transform-Job-Extract-Thumbnail"
            },
            "Submit-Transform-Job-Extract-Thumbnail": {
              "Comment": "Task responsible to create the job, it uses the AWS Step Function SDK to get the token of the Process Job Activity",
              "Type": "Task",
              "Resource": "${aws_lambda_function.createTransformJobExtractThumbnail.arn}",
              "End": true
            }
          }
        }
      ]
    },
    "Transform-Job-Create-Proxy": {
      "Type": "Parallel",
      "Next": "UpdateAssetInMediaRepo",
      "Branches": [{
          "Comment": "awaits Job Completion API to state workflow",
          "StartAt": "Monitor-Transform-Job-Create-Proxy",
          "States": {
            "Monitor-Transform-Job-Create-Proxy": {
              "Type": "Task",
              "Resource": "${aws_sfn_activity.job_completion_activity.id}",
              "TimeoutSeconds": 3600,
              "HeartbeatSeconds": 1800,
              "End": true
            }
          }
        }, {
          "StartAt": "Prepare-Transform-Job-Create-Proxy",
          "States": {
            "Prepare-Transform-Job-Create-Proxy": {
              "Comment": "Wait Step as the ProcessJob Activity needs to be available before the CreateJob step is executed",
              "Type": "Wait",
              "Seconds": 1,
              "Next": "Submit-Transform-Job-Create-Proxy"
            },
            "Submit-Transform-Job-Create-Proxy": {
              "Comment": "Task responsible to create the job, it uses the AWS Step Function SDK to get the token of the Process Job Activity",
              "Type": "Task",
              "Resource": "${aws_lambda_function.createTransformJobCreateProxy.arn}",
              "End": true
            }
          }
        }
      ]
    },
    "UpdateAssetInMediaRepo": {
      "Type": "Task",
      "Resource": "${aws_lambda_function.updateAssetInMediaRepo.arn}",
      "Next": "CreateAssetInSemanticRepo"
    },
    "CreateAssetInSemanticRepo": {
      "Type": "Task",
      "Resource": "${aws_lambda_function.createAssetInSemanticRepo.arn}",
      "End": true
    }
  }
}
EOF
}

##################################
# aws_s3_bucket : repo-bucket
##################################
# Bucket representing the private repo
# for sake of demonstration the bucket is public
# to easily access the generated proxy and thumbnail
###################################

resource "aws_s3_bucket" "repo-bucket" {
  bucket = "${var.repo-bucket}"

  # acl = "public-read"
  policy = <<EOF
{
  "Id": "bucket_policy_site",
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "bucket_policy_public",
      "Action": [
        "s3:GetObject"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${var.repo-bucket}/*",
      "Principal": "*"
    }
  ]
}
EOF

  website {
    index_document = "index.html"
    error_document = "error.html"
  }

  tags {}
}

##################################
# aws_s3_bucket : public-ingest-bucket
##################################
# Bucket where content is uploaded to be 
# processed 
##################################

resource "aws_s3_bucket" "public-ingest-bucket" {
  bucket = "${var.public-ingest-bucket}"
  acl    = "private"
}

resource "aws_s3_bucket_notification" "public-ingest-bucket_notification" {
  bucket = "${aws_s3_bucket.public-ingest-bucket.id}"

  lambda_function {
    lambda_function_arn = "${aws_lambda_function.triggerWorkflowFromLambda.arn}"
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = "jsonld"
  }
}

##############################
#  Step activity task to handle asynch service response 
##############################

resource "aws_sfn_activity" "job_completion_activity" {
  name = "${var.jobCompletionActivity}"
}

##############################
#  Below is the code of the lambda  / API Gateway 
#  managing the call back to the workflow activity
#  task
#  The API Gateway integration with Step Function was
#  not easily deployable with current version of Terraform.
#  Instead a simple lambda using the Step Function API is used 
##############################

#################################
#  aws_iam_role : iam_for_exec_lambda
#################################

resource "aws_iam_role" "iam_for_exec_wf_activity_lambda" {
  name = "${var.lambdaWorkflowActivityExecutionRoleName}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"

      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "log_wf_activity_policy" {
  name        = "log_wf_activity_policy"
  description = "Policy to write to log"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:*"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role_wf_activity-policy-log" {
  role       = "${aws_iam_role.iam_for_exec_wf_activity_lambda.name}"
  policy_arn = "${aws_iam_policy.log_wf_activity_policy.arn}"
}

resource "aws_iam_role_policy_attachment" "role_wf_activity-policy-steps" {
  role       = "${aws_iam_role.iam_for_exec_wf_activity_lambda.name}"
  policy_arn = "${aws_iam_policy.steps_policy.arn}"
}

#################################
#  Lambda : send-callback-to-wf-activity
#################################

resource "aws_lambda_function" "send-callback-to-wf-activity_lambda" {
  filename         = "./../workflow/send-callback-to-wf-activity/build/workflow-send-callback-to-wf-package.zip"
  function_name    = "${var.sendCallbackToWFActivityFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_wf_activity_lambda.arn}"
  handler          = "${var.sendCallbackToWFActivityModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/send-callback-to-wf-activity/build/workflow-send-callback-to-wf-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "60"
  memory_size      = "1024"
}

##############################
#  API Gateway
##############################
resource "aws_api_gateway_rest_api" "job_activity_completion_api" {
  name        = "${var.jobCompletionRestAPIName}"
  description = "Service Registry Rest Api"
}

resource "aws_api_gateway_resource" "job_activity_completion_api_resource" {
  rest_api_id = "${aws_api_gateway_rest_api.job_activity_completion_api.id}"
  parent_id   = "${aws_api_gateway_rest_api.job_activity_completion_api.root_resource_id}"
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "job_activity_completion_api_method" {
  rest_api_id   = "${aws_api_gateway_rest_api.job_activity_completion_api.id}"
  resource_id   = "${aws_api_gateway_resource.job_activity_completion_api_resource.id}"
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "job_activity_completion_api_method-integration" {
  rest_api_id             = "${aws_api_gateway_rest_api.job_activity_completion_api.id}"
  resource_id             = "${aws_api_gateway_resource.job_activity_completion_api_resource.id}"
  http_method             = "${aws_api_gateway_method.job_activity_completion_api_method.http_method}"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.region}:${var.account_id}:function:${aws_lambda_function.send-callback-to-wf-activity_lambda.function_name}/invocations"
  integration_http_method = "POST"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.send-callback-to-wf-activity_lambda.arn}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${var.region}:${var.account_id}:${aws_api_gateway_rest_api.job_activity_completion_api.id}/*/${aws_api_gateway_method.job_activity_completion_api_method.http_method}/*"
}

resource "aws_api_gateway_deployment" "job_activity_completion_deployment" {
  depends_on = [
    "aws_api_gateway_method.job_activity_completion_api_method",
    "aws_api_gateway_integration.job_activity_completion_api_method-integration",
  ]

  rest_api_id = "${aws_api_gateway_rest_api.job_activity_completion_api.id}"
  stage_name  = "${var.jobCompletionAPIStageName}"
}

##################################
# Output 
##################################


#output "GenerateAndTransformFeedarn" {
#  value = "${aws_lambda_function.GenerateAndTransformFeed_lambda.arn}"
#}


########################################

