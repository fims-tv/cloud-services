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
  name = "role_exec_lambda_${local.env_composite_name}"

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

resource "aws_iam_policy" "log_policy" {
  name        = "log_policy_${local.env_composite_name}"
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

resource "aws_iam_policy" "DynamoDB_policy" {
  name        = "dynamodb_policy_${local.env_composite_name}"
  description = "Policy to Access DynamoDB"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "dynamodb:*",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role-policy-DynamoDB" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "${aws_iam_policy.DynamoDB_policy.arn}"
}

resource "aws_iam_role_policy_attachment" "role-policy-lambda-full-access" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
}




resource "aws_iam_policy" "rekognition_policy" {
  name        = "rekognition_policy_${local.env_composite_name}"
  description = "Policy to Access rekognition"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rekognition:*",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "role-policy-rekognition" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "${aws_iam_policy.rekognition_policy.arn}"
}


#################################
#  Lambda : rest-api-ai_service_lambda
#################################

resource "aws_lambda_function" "api_ai_service_lambda" {
  filename         = "./../ai-service/build/rest-api-lambda-package.zip"
  function_name    = "${local.env_composite_name}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.restApiLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../ai-service/build/rest-api-lambda-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "60"
  memory_size      = "1024"
}

#################################
#  Lambda : worker-ai_service_lambda_worker
#################################

resource "aws_lambda_function" "worker_lambda" {
  filename         = "./../ai-service/build/worker-lambda-package.zip"
  function_name    = "${local.env_composite_name}_worker"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.workerApiLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../ai-service/build/worker-lambda-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "60"
  memory_size      = "1024"


  environment {
    variables = {
      REKO_SNS_ROLE_ARN = "${aws_iam_role.iam_role_Reko_to_SNS.arn}",
      SNS_TOPIC_ARN=   "${aws_sns_topic.sns_topic_reko_output.arn}"
    }
  }

}

#################################
#  Lambda : worker-result-ai_service_lambda_worker_result
#################################

resource "aws_lambda_function" "worker_lambda_result" {
  filename         = "./../ai-service/build/worker-result-lambda-package.zip"
  function_name    = "${local.env_composite_name}_worker_result"
  role             = "${aws_iam_role.aws_iam_role_sns_to_lambda.arn}"
  handler          = "${var.workerResultApiLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../ai-service/build/worker-result-lambda-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "60"
  memory_size      = "1024"
}

##################################
# aws_dynamodb_table : repo_service_table
##################################

resource "aws_dynamodb_table" "repo_service_table" {
  name           = "${local.env_composite_name}"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "resource_type"
  range_key      = "resource_id"

  attribute {
    name = "resource_type"
    type = "S"
  }

  attribute {
    name = "resource_id"
    type = "S"
  }

  tags {
    framework = "FIMSCLOUD"
    version   = "V1.0"
    author    = "Loic Barbou"
  }
  
  stream_enabled = true
  stream_view_type = "NEW_IMAGE"


}

##############################
#  API Gateway
##############################
resource "aws_api_gateway_rest_api" "ame_service_api" {
  name        = "${local.env_composite_name}"
  description = "Service Registry Rest Api"
}

resource "aws_api_gateway_resource" "ame_service_api_resource" {
  rest_api_id = "${aws_api_gateway_rest_api.ame_service_api.id}"
  parent_id   = "${aws_api_gateway_rest_api.ame_service_api.root_resource_id}"
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "ame_service_api_method" {
  rest_api_id   = "${aws_api_gateway_rest_api.ame_service_api.id}"
  resource_id   = "${aws_api_gateway_resource.ame_service_api_resource.id}"
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "ame_service_api_method-integration" {
  rest_api_id             = "${aws_api_gateway_rest_api.ame_service_api.id}"
  resource_id             = "${aws_api_gateway_resource.ame_service_api_resource.id}"
  http_method             = "${aws_api_gateway_method.ame_service_api_method.http_method}"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.region}:${var.account_id}:function:${aws_lambda_function.api_ai_service_lambda.function_name}/invocations"
  integration_http_method = "POST"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.api_ai_service_lambda.arn}"
  principal     = "apigateway.amazonaws.com"

  # More: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
  source_arn = "arn:aws:execute-api:${var.region}:${var.account_id}:${aws_api_gateway_rest_api.ame_service_api.id}/*/${aws_api_gateway_method.ame_service_api_method.http_method}/*"
}

resource "aws_api_gateway_deployment" "ame_service_deployment" {
  depends_on = [
    "aws_api_gateway_method.ame_service_api_method",
    "aws_api_gateway_integration.ame_service_api_method-integration",
  ]

  rest_api_id = "${aws_api_gateway_rest_api.ame_service_api.id}"
  stage_name  = "${var.environmentType}"

  variables = {
    "TableName"                = "${local.env_composite_name}"
    "PublicUrl"                = "https://${aws_api_gateway_rest_api.ame_service_api.id}.execute-api.${var.region}.amazonaws.com/${var.environmentType}"
    "WorkerLambdaFunctionName" = "${aws_lambda_function.worker_lambda.function_name}"
  }
}
##################################
##################################
# AI Rekognition 
##################################
##################################


##################################
# AI Rekognition  - Roles
##################################

# Allows Rekognition to call AWS services on your behalf
resource "aws_iam_role" "iam_role_Reko_to_SNS" {
  name = "role_reko_toSNS_${local.env_composite_name}"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "rekognition.amazonaws.com"
      },
      "Action": "sts:AssumeRole",
      "Condition": {}
    }
  ]
}
EOF
}



resource "aws_iam_policy" "aws_iam_policy_Reko_to_SNS" {
  name        = "policy_reko_to_SNS_${local.env_composite_name}"
  description = "Policy for Reko to access SNS"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish"
            ],
            "Resource": "arn:aws:sns:*:*:AmazonRekognition*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kinesis:PutRecord",
                "kinesis:PutRecords"
            ],
            "Resource": "arn:aws:kinesis:*:*:stream/AmazonRekognition*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kinesisvideo:GetDataEndpoint",
                "kinesisvideo:GetMedia"
            ],
            "Resource": "*"
        }
    ]
}
EOF
}


resource "aws_iam_role_policy_attachment" "role-policy-reko-to-SNS" {
  role       = "${aws_iam_role.iam_role_Reko_to_SNS.name}"
  policy_arn = "${aws_iam_policy.aws_iam_policy_Reko_to_SNS.arn}"
}


resource "aws_iam_role_policy_attachment" "role-policy-log-reko-to-SNS" {
  role       = "${aws_iam_role.iam_role_Reko_to_SNS.name}"
  policy_arn = "${aws_iam_policy.log_policy.arn}"
}


resource "aws_iam_role_policy_attachment" "role-policy-rekognition-reko-to-SNS" {
  role       = "${aws_iam_role.iam_role_Reko_to_SNS.name}"
  policy_arn = "${aws_iam_policy.rekognition_policy.arn}"
}


resource "aws_iam_role_policy_attachment" "role-policy-lambda-full-access-reko-to-SNS" {
  role       = "${aws_iam_role.iam_role_Reko_to_SNS.name}"
  policy_arn = "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
}


##################################
# AI Rekognition  - SNS
##################################

resource "aws_lambda_permission" "aws_lambda_permission_with_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.worker_lambda_result.function_name}"
  principal     = "sns.amazonaws.com"
  source_arn    = "${aws_sns_topic.sns_topic_reko_output.arn}"
}

resource "aws_sns_topic" "sns_topic_reko_output" {
  name = "AmazonRekognition_${local.env_composite_name}"
}

resource "aws_sns_topic_subscription" "aws_sns_topic_sub_lambda" {
  topic_arn = "${aws_sns_topic.sns_topic_reko_output.arn}"
  protocol  = "lambda"
  endpoint  = "${aws_lambda_function.worker_lambda_result.arn}"
}

resource "aws_iam_role" "aws_iam_role_sns_to_lambda" {
  name = "iam_for_lambda_with_sns"

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


resource "aws_iam_role_policy_attachment" "role-policy-SNS-to-Lambda" {
  role       = "${aws_iam_role.aws_iam_role_sns_to_lambda.name}"
  policy_arn = "${aws_iam_policy.aws_iam_policy_Reko_to_SNS.arn}"
}


resource "aws_iam_role_policy_attachment" "role-policy-log-SNS-to-Lambda" {
  role       = "${aws_iam_role.aws_iam_role_sns_to_lambda.name}"
  policy_arn = "${aws_iam_policy.log_policy.arn}"
}


resource "aws_iam_role_policy_attachment" "role-policy-rekognition-SNS-to-Lambda" {
  role       = "${aws_iam_role.aws_iam_role_sns_to_lambda.name}"
  policy_arn = "${aws_iam_policy.rekognition_policy.arn}"
}

resource "aws_iam_role_policy_attachment" "role-policy-DynamoDB-SNS-to-Lambda" {
  role       = "${aws_iam_role.aws_iam_role_sns_to_lambda.name}"
  policy_arn = "${aws_iam_policy.DynamoDB_policy.arn}"
}

resource "aws_iam_role_policy_attachment" "role-policy-lambda-full-access-SNS-to-Lambda" {
  role       = "${aws_iam_role.aws_iam_role_sns_to_lambda.name}"
  policy_arn = "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
}




##################################
# Output 
##################################

output "rest_service_url" {
  value = "https://${aws_api_gateway_deployment.ame_service_deployment.rest_api_id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_deployment.ame_service_deployment.stage_name}"
}

output "lambda_arn" {
  value = "${aws_lambda_function.api_ai_service_lambda.arn}"
}


output "dynamodb_stream_arn" {
  value = "${aws_dynamodb_table.repo_service_table.stream_arn}"
}

output "dynamodb_table_name" {
  value = "${aws_dynamodb_table.repo_service_table.name}"
}

