# cloud-services

This repository contains an example implementation of the FIMS 2.0 framework using cloud services.

## Overview


## Version

2.0.0

## Requirements for running the example
* Node.js v4.3.2 and NPM 2.14.12 installed and accessible in PATH. Recommended is to use a node version manager, which allows you to quickly switch between node versions (see more info at [nvm-windows](https://github.com/coreybutler/nvm-windows))
* Terraform and available in PATH. See the [Terraform website](https://www.terraform.io/)
* Java JRE or JDK 1.7 or higher to run gradlew build script
* AWS account

## Setup procedure
1. Clone this repository to your local harddrive
2. Navigate to the node-services/deploy folder.
3. Create file named terraform.tfvars
4. Add the following informaton to the created file and update the parameter values reflecting your AWS account 
```
 	region = "us-east-2"
   	access_key = "AWS Access KEY"
 	secret_key  = "AWS Secret Key"
 	account_id = "AWS Account ID"
```

5. Open the main.tf in a text editor and change the 'public-ingest-bucket' and 'repo-bucket' into a globally unique name. E.g. use public-ingest.your-domain.com and private-repo.your-domain.com to ensure unique names.
6. Update the 'environmentName' and 'environmentType' variables to meaningful values.  
4. Save the file.
5. Open command line in cloud-services folder.
6. Execute `gradlew deploy`.
9. If no errors have occured until now you have successfully setup the infrastructure in your aws cloud. Go to https://aws.amazon.com/console/ and sign in to see your cloud infrastructure.

## Testing the workflow
To start the workflow you need to copy and paste a media file and a specific metadata file into the public-ingest bucket. Best strategy is to create manually a third bucket in which you upload a media and metadata files. From there you can then do a copy and paste into the public-ingest bucket. Then go to the 'Step Functions' section on the AWS console and follow the workflow.

Example files can be found at URL:
https://www.dropbox.com/sh/8f3ei9tnr2e3na1/AABzP4iPVGXDAUtvOmXF37Aza?dl=0
