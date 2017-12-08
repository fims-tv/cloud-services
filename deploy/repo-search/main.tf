provider "aws" {
  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  region     = "${var.region}"
}




#################################
#  Elastic search
#################################

data "aws_iam_policy_document" "es_management_access" {
  statement {
    actions = [
      "es:*",
    ]

    resources = [
      "${aws_elasticsearch_domain.es.arn}",
      "${aws_elasticsearch_domain.es.arn}/*",
    ]

    principals {
      type = "AWS"

      identifiers = ["${distinct(compact(var.management_iam_roles))}"]
    }

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"

      values = ["${distinct(compact(var.management_public_ip_addresses))}"]
    }
  }
}

resource "aws_elasticsearch_domain" "es" {
  domain_name           = "${var.domain_name}"
  elasticsearch_version = "${var.es_version}"

  cluster_config {
    instance_type            = "${var.instance_type}"
    instance_count           = "${var.instance_count}"
    dedicated_master_enabled = "${var.instance_count >= 10 ? true : false}"
    dedicated_master_count   = "${var.instance_count >= 10 ? 3 : 0}"
    dedicated_master_type    = "${var.instance_count >= 10 ? (var.dedicated_master_type != "false" ? var.dedicated_master_type : var.instance_type) : ""}"
    zone_awareness_enabled   = "${var.es_zone_awareness}"
  }

  # advanced_options {
  # }

  ebs_options {
    ebs_enabled = "${var.ebs_volume_size > 0 ? true : false}"
    volume_size = "${var.ebs_volume_size}"
    volume_type = "${var.ebs_volume_type}"
  }
  snapshot_options {
    automated_snapshot_start_hour = "${var.snapshot_start_hour}"
  }
  tags {
    Domain = "${var.domain_name}"
  }
}

resource "aws_elasticsearch_domain_policy" "es_management_access" {
  domain_name     = "${var.domain_name}"
  access_policies = "${data.aws_iam_policy_document.es_management_access.json}"
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

resource "aws_iam_policy" "es_policy" {
  name        = "es_${var.serviceName}_policy"
  description = "Policy to ES"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "es:ESHttpGet",
                "es:ESHttpHead",
                "es:ESHttpPost",
                "es:ESHttpPut"

            ],
            "Effect": "Allow",
            "Resource": "${aws_elasticsearch_domain.es.arn}/*"
        }
    ]
}
EOF
}


resource "aws_iam_role_policy_attachment" "role-policy-ES" {
  role       = "${aws_iam_role.iam_for_exec_lambda.name}"
  policy_arn = "${aws_iam_policy.es_policy.arn}"
}


/* module "es-dyna-mediarepo" {
  source = "./es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${var.sourceTableName}"
  triggerLambdaFunctionName= "dyna-to-es-${var.sourceTableName}"
  triggerLambdaRoleArn= "${aws_iam_role.iam_for_exec_lambda.arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${var.dynamoDBStreamArn}"
  esEndpoint= "${aws_elasticsearch_domain.es.endpoint}"
  esDomainid= "${aws_elasticsearch_domain.es.domain_id}"

} */



/* #################################
#  Lambda : rest-api-service-registry_lambda
#################################

resource "aws_lambda_function" "dyna_to_es_lambda" {
  filename         = "./../repo-search/build/dynamo-to-elasticsearch.zip"
  function_name    = "${var.triggerLambdaFunctionName}"
  role             = "${aws_iam_role.iam_for_exec_lambda.arn}"
  handler          = "${var.triggerLambdaModuleName}.handler"
  source_code_hash = "${base64sha256(file("./../repo-search/build/dynamo-to-elasticsearch.zip"))}"
  runtime          = "nodejs6.10"
  timeout          = "30"
  memory_size      = "512"

  environment {
    variables = {
      TABLE = "${var.sourceTableName}",
      ES_ENDPOINT=   "${aws_elasticsearch_domain.es.endpoint}",
      ES_DOMAIN =  "${aws_elasticsearch_domain.es.domain_id}",
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
 */



##################################
# Output 
##################################


output "es_arn" {
  description = "Amazon Resource Name (ARN) of the domain"
  value       = "${aws_elasticsearch_domain.es.arn}"
}

output "es_domain_id" {
  description = "Unique identifier for the domain"
  value       = "${aws_elasticsearch_domain.es.domain_id}"
}

output "es_endpoint" {
  description = "Domain-specific endpoint used to submit index, search, and data upload requests"
  value       = "${aws_elasticsearch_domain.es.endpoint}"
}

output "kibana_endpoint" {
  description = "Domain-specific endpoint hosting the kibana portal"
  value       = "${aws_elasticsearch_domain.es.endpoint}/_plugin/kibana/"
}

output "lambda_role_arn" {
  value = "${aws_iam_role.iam_for_exec_lambda.arn}"
}