##########################
# Global Variables
##########################

variable access_key {
  default = "ACCESS KEY"
}

variable secret_key {
  default = "SECRET KEY"
}

variable account_id {
  default = "ACCOUNT ID"
}

variable region {
  default = "REGION"
}



#########################
# Workflow Variables
#########################

variable "public-ingest-bucket" {
  default = "public-ingest.bloommberg.dev.fims.tv"
}

variable "repo-bucket" {
  default = "private-repo.bloomberg.dev.fims.tv"
}

variable "serviceName" {
  default = "fims-ibc"
}

#########################
# Module registration 
# Run a terraform get on each module before executing this script
#########################

module "service-registry" {
  source = "./service-registry"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"
}

module "job-repository" {
  source = "./job-repository"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"
}

module "job-processor-service" {
  source = "./job-processor-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  serviceRegistryUrl = "${module.service-registry.rest_service_url}"
}

module "ame-service" {
  source = "./ame-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"
}

module "transform-service" {
  source = "./transform-service"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"
}

module "media-repository" {
  source = "./media-repository"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"
}

module "workflow" {
  source = "./workflow"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  public-ingest-bucket = "${var.public-ingest-bucket}"
  repo-bucket          = "${var.repo-bucket}"

  serviceRegistryUrl = "${module.service-registry.rest_service_url}"
}


#######################
# Search services
#######################

module "repo-search" {
  source = "./repo-search"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  dynamoDBStreamArn = "${module.media-repository.dynamodb_stream_arn}"

}

module "es-dyna-mediarepo" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.media-repository.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.media-repository.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${module.media-repository.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"


}

module "es-dyna-jobrepo" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.job-repository.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.job-repository.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${module.job-repository.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}


module "es-dyna-job-processor" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.job-processor-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.job-processor-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${module.job-processor-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}



module "es-dyna-job-ame" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.ame-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.ame-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${module.ame-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}

module "es-dyna-service-registry" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.service-registry.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.service-registry.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${module.service-registry.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}

module "es-dyna-transform-service" {
  source = "./repo-search/es-dyna-provider"

  access_key = "${var.access_key}"
  secret_key = "${var.secret_key}"
  account_id = "${var.account_id}"
  region     = "${var.region}"

  sourceTableName = "${module.transform-service.dynamodb_table_name}"
  triggerLambdaFunctionName= "dyna-to-es-${module.transform-service.dynamodb_table_name}"
  triggerLambdaRoleArn= "${module.repo-search.lambda_role_arn}"
  serviceName= "${var.serviceName}"
  dynamoDBStreamArn= "${module.transform-service.dynamodb_stream_arn}"
  esEndpoint= "${module.repo-search.es_endpoint}"
  esDomainid= "${module.repo-search.es_domain_id}"

}



#########################
# Output variables
#########################

output publicBucket {
  value = "${var.public-ingest-bucket}"
}

output publicBucketUrl {
  value = "https://s3.amazonaws.com/${var.public-ingest-bucket}"
}

output privateBucket {
  value = "${var.repo-bucket}"
}

output privateBucketUrl {
  value = "https://s3.amazonaws.com/${var.repo-bucket}"
}

output "serviceRegistryUrl" {
  value = "${module.service-registry.rest_service_url}"
}

output "jobRepositoryUrl" {
  value = "${module.job-repository.rest_service_url}"
}

output "jobProcessorServiceUrl" {
  value = "${module.job-processor-service.rest_service_url}"
}

output "ameServiceUrl" {
  value = "${module.ame-service.rest_service_url}"
}

output "transformServiceUrl" {
  value = "${module.transform-service.rest_service_url}"
}

output "mediaRepositoryUrl" {
  value = "${module.media-repository.rest_service_url}"
}


output "es_domain_id" {
  description = "Unique identifier for the ES domain"
  value       = "${module.repo-search.es_domain_id}" 
}

output "es_endpoint" {
  description = "Domain-specific endpoint used to submit index, search, and data upload requests"
  value       = "${module.repo-search.es_endpoint}" 
}

output "kibana_endpoint" {
  description = "Domain-specific endpoint hosting the kibana portal"
  value       = "${module.repo-search.kibana_endpoint}" 
}