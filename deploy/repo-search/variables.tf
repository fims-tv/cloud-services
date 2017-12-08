variable "access_key" {}
variable "secret_key" {}
variable "account_id" {}
variable "region" {}

variable "sourceTableName" {
  default = "fims-media-repo-ibc"
}

variable "lambdaExecutionRoleName" {
  default = "fims-dyna-to-es-service-lambda-execution-role-ibc"
}

variable "triggerLambdaFunctionName" {
  default = "fims-dyna-es"
}

variable "triggerLambdaModuleName" {
  default = "dynamo-to-elasticsearch"
}

variable "serviceName" {
  default = "fims-ibc"
}

variable "dynamoDBStreamArn" {
 // default = "arn:aws:dynamodb:us-east-2:753770047419:table/fims-media-repo-ibc/stream/2017-11-28T21:17:51.337"
}

#################################
#  Elastic search variables
#################################

variable "domain_name" {
  description = "Domain name for Elasticsearch cluster (will be prefixed with 'tf-')"
  default     = "es-fims-search"
}

variable "es_version" {
  description = "Version of Elasticsearch to deploy (default 5.1)"
  default     = "5.5"
}

variable "instance_type" {
  description = "ES instance type for data nodes in the cluster (default t2.small.elasticsearch)"
  default     = "t2.small.elasticsearch"
}

variable "instance_count" {
  description = "Number of data nodes in the cluster (default 6)"
  default     = 6
}

variable "dedicated_master_type" {
  description = "ES instance type to be used for dedicated masters (default same as instance_type)"
  default     = false
}

variable "management_iam_roles" {
  description = "List of IAM role ARNs from which to permit management traffic (default ['*']).  Note that a client must match both the IP address and the IAM role patterns in order to be permitted access."
  type        = "list"
  default     = ["*"]
}

variable "management_public_ip_addresses" {
  description = "List of IP addresses from which to permit management traffic (default []).  Note that a client must match both the IP address and the IAM role patterns in order to be permitted access."
  type        = "list"
  default     = ["0.0.0.0/0"]
}

variable "es_zone_awareness" {
  description = "Enable zone awareness for Elasticsearch cluster (default false)"
  default     = "false"
}

variable "ebs_volume_size" {
  description = "Optionally use EBS volumes for data storage by specifying volume size in GB (default 0)"
  default     = 10
}

variable "ebs_volume_type" {
  description = "Storage type of EBS volumes, if used (default gp2)"
  default     = "gp2"
}

variable "snapshot_start_hour" {
  description = "Hour at which automated snapshots are taken, in UTC (default 0)"
  default     = 0
}