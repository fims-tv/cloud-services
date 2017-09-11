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
  filename         = "./../workflow/trigger-workfow-from-lambda/build/trigger-workflow-from-lambda-package.zip"
  function_name    = "${var.triggerWorkflowLambdaFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.triggerWorkflowLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../workflow/trigger-workfow-from-lambda/build/trigger-workflow-from-lambda-package.zip"))}"
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
#  Step Functions : FeedIngestWorflow
#################################

resource "aws_sfn_state_machine" "stepWorkflow" {
  name     = "FIMS_Ingest_Workflow"
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

##################################
# Output 
##################################


#output "GenerateAndTransformFeedarn" {
#  value = "${aws_lambda_function.GenerateAndTransformFeed_lambda.arn}"
#}


########################################

