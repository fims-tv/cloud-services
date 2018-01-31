provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.region}"
}


#################################
#  Lambda : rest-api-service-registry_lambda
#################################

resource "aws_lambda_function" "dyna_to_es_lambda" {
  filename         = "./../repo-search/build/dynamo-to-elasticsearch.zip"
  function_name    = "${var.triggerLambdaFunctionName}"
  role             = "${var.triggerLambdaRoleArn}"
  handler          = "${var.triggerLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../repo-search/build/dynamo-to-elasticsearch.zip"))}"
  runtime          = "nodejs6.10"
  timeout          = "240"
  memory_size      = "2048"

  environment {
    variables = {
      TABLE = "${var.sourceTableName}",
      ES_ENDPOINT=   "${var.esEndpoint}",
      ES_DOMAIN =  "${var.esDomainid}",
      REGION = "${var.region}"
    }
  }

}

##################################
# aws_dynamodb_table to Lambda trigger : repo_service_table
##################################


resource "aws_lambda_event_source_mapping" "event_source_mapping" {
  batch_size        = 100
  event_source_arn  = "${var.dynamoDBStreamArn}"
  enabled           = true
  function_name     = "${aws_lambda_function.dyna_to_es_lambda.arn}"
  starting_position = "LATEST"
}




