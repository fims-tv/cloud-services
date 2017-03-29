//"use strict";

var fs = require("fs");

var DEPLOY_CONFIG_FILE = "./deploy-config.json";
var TEST_CONFIG_FILE = "./test-config.json";

module.exports = {
    deployConfig: function () {
        console.log();
        console.log("Loading Deployment Configuration file");
        if (fs.existsSync(DEPLOY_CONFIG_FILE)) {
            var data = fs.readFileSync(DEPLOY_CONFIG_FILE);
            console.log("Deployment Configuration file loaded");
            return JSON.parse(data.toString());
        } else {
            console.error("Deployment Configuration file is missing");
            console.error("Create a file with name '" + DEPLOY_CONFIG_FILE + "' with the following content:");
            console.error("{");
            console.error("  \"tableName\": \"fims-ame\",");
            console.error("  \"lambdaExecutionRoleName\": \"fims-ame-lambda-execution-role\",");
            console.error("  \"lambdaApiFunctionName\": \"fims-ame-api-lambda-function\",");
            console.error("  \"lambdaProcessorFunctionName\": \"fims-ame-processor-lambda-function\",");
            console.error("  \"restApiName\": \"fims-ame-rest-api\",");
            console.error("  \"restApiStageName\": \"test\"");
            console.error("}");
            process.exit(1);
        }
    },
    testConfig: function () {
        console.log();
        console.log("Loading Test Configuration file");
        if (fs.existsSync(TEST_CONFIG_FILE)) {
            var data = fs.readFileSync(TEST_CONFIG_FILE);
            console.log("Test Configuration file loaded");
            return JSON.parse(data.toString());
        } else {
            console.error("Test Configuration file is missing");
            console.error("Create a file with name '" + TEST_CONFIG_FILE + "' with the following content:");
            console.error(
                "{\n" +
                "    \"aws\": {\n" +
                "        \"endpoint\": \"https://<restApiId>.execute-api.<region>.amazonaws.com/<stageName>\"\n" +
                "    },\n" +
                "    \"local\": {\n" +
                "        \"endpoint\": \"http://localhost:8888\",\n" +
                "        \"dynamodb\": \"http://localhost:8000\",\n" +
                "        \"region\": \"<region>\"\n" +
                "    },\n" +
                "    \"default\": \"local\"\n" +
                "}");

            process.exit(1);
        }
    }
}