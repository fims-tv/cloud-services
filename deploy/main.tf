#########################
# Global Variables 

variable access_key {
  default = "type your access key"
}

variable secret_key {
  default = "type your secret key"
}

variable account_id {
  default = "type your aws account id - you can find it in the account info in AWS console"
}

variable region {
  default = "us-east-1"
}

#########################
# Module registration 
# Run a terraform get on each module before executing this script
########################

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
