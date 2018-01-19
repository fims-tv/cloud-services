provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.region}"
}


locals {
  env_composite_name = "${var.serviceName}-${var.environmentName}-${var.environmentType}"
}

#################################
#  aws_iam_role : iam_for_exec_lambda
#################################

resource "aws_iam_role" "iam_for_exec_lambda" {
name = "role_exec_lambda_worflow_${local.env_composite_name}"

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
  function_name = "${aws_lambda_function.triggerAIServiceFromLambda.arn}"
  principal     = "s3.amazonaws.com"
  source_arn    = "${aws_s3_bucket.public-ingest-bucket.arn}"
}

resource "aws_iam_policy" "log_policy" {
   name = "policy_worflow_log_${local.env_composite_name}"
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


resource "aws_iam_policy" "S3_policy" {
  name = "policy_s3_${local.env_composite_name}"
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
#  Lambda : triggerServiceFromLambda
#################################

resource "aws_lambda_function" "triggerAIServiceFromLambda" {
  filename         = "./../triggers/trigger_ai_from_s3/build/trigger-ai-service.zip"
  function_name    = "trigger_ai_service_${local.env_composite_name}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.triggerAIServiceLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../triggers/trigger_ai_from_s3/build/trigger-ai-service.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "15"
  memory_size      = "128"

  environment {
    variables = {
      SERVICE_REGISTRY_URL     = "${var.serviceRegistryUrl}"
      JOB_OUTPUT_BUCKET        = "${var.repo-bucket}"
      JOB_OUTPUT_KEY_PREFIX    = "ame-service-output/"

    }
  }
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
    lambda_function_arn = "${aws_lambda_function.triggerAIServiceFromLambda.arn}"
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = "mp4"
  }
}
