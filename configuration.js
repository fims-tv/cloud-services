//"use strict";

var fs = require("fs");

var CONFIG_FILE = "./config.json";

module.exports = {
    load: function () {
        console.log();
        console.log("Loading config file");
        if (fs.existsSync(CONFIG_FILE)) {
            var data = fs.readFileSync(CONFIG_FILE);
            console.log("Config file loaded");
            return JSON.parse(data.toString());
        } else {
            console.error("Configuration file is missing");
            console.error("Create a file with name '" + CONFIG_FILE + "' with the following content:");
            console.error("{");
            console.error("  \"tableName\": \"fims-ame\",");
            console.error("  \"lambdaExecutionRoleName\": \"fims-ame-lambda-execution-role\",");
            console.error("  \"lambdaApiFunctionName\": \"fims-ame-api-lambda-function\",");
            console.error("  \"restApiName\": \"fims-ame-rest-api\",");
            console.error("  \"restApiStageName\": \"test\"");
            console.error("}");
            process.exit(1);
        }
    }
}