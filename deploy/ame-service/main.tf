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

resource "aws_iam_policy" "log_policy" {
  name        = "log_${var.serviceName}_policy"
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
  name        = "dynamodb_${var.serviceName}_policy"
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

#################################
#  Lambda : rest-api-ame_service_lambda
#################################

resource "aws_lambda_function" "api_ame_service_lambda" {
  filename         = "./../ame-service/build/rest-api-lambda-package.zip"
  function_name    = "${var.restApiLambdaFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.restApiLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../ame-service/build/rest-api-lambda-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "60"
  memory_size      = "1024"
}

#################################
#  Lambda : worker-ame_service_lambda
#################################

resource "aws_lambda_function" "ame_worker_lambda" {
  filename         = "./../ame-service/build/worker-lambda-package.zip"
  function_name    = "${var.workerApiLambdaFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.workerApiLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../ame-service/build/worker-lambda-package.zip"))}"
  runtime          = "nodejs4.3"
  timeout          = "60"
  memory_size      = "1024"
}

##################################
# aws_dynamodb_table : repo_service_table
##################################

resource "aws_dynamodb_table" "repo_service_table" {
  name           = "${var.repotTableName}"
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
}

##############################
#  API Gateway
##############################
resource "aws_api_gateway_rest_api" "ame_service_api" {
  name        = "${var.restApiName}"
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
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.region}:${var.account_id}:function:${aws_lambda_function.api_ame_service_lambda.function_name}/invocations"
  integration_http_method = "POST"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.api_ame_service_lambda.arn}"
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
  stage_name  = "${var.restApiStageName}"

  variables = {
    "TableName"                = "${var.repotTableName}"
    "PublicUrl"                = "https://${aws_api_gateway_rest_api.ame_service_api.id}.execute-api.${var.region}.amazonaws.com/${var.restApiStageName}"
    "WorkerLambdaFunctionName" = "${var.workerApiLambdaFunctionName}"
  }
}

##################################
# Output 
##################################

output "rest_service_url" {
  value = "https://${aws_api_gateway_deployment.ame_service_deployment.rest_api_id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_deployment.ame_service_deployment.stage_name}"
}

output "lambda_arn" {
  value = "${aws_lambda_function.api_ame_service_lambda.arn}"
}
