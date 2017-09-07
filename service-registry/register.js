var async = require("async");
var fims = require("fims-aws").CORE;

function createServices(serviceUrls) {

    var services = [];

    for (var prop in serviceUrls) {
        switch (prop) {
            case "ameServiceUrl":
                services.push(
                    new fims.Service(
                        "MediaInfo AME Service",
                        [
                            new fims.ServiceResource("fims:JobAssignment", serviceUrls[prop] + "/JobAssignment")
                        ],
                        "fims:AmeJob",
                        [
                            new fims.JobProfile(
                                "ExtractTechnicalMetadata",
                                [
                                    new fims.JobParameter("ebucore:hasRelatedResource", "fims:BMEssence")
                                ],
                                [
                                    new fims.JobParameter("ebucore:locator")
                                ]
                            )
                        ],
                        [
                            "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt",
                            "https://s3-us-east-1.amazonaws.com/us-east-1.rovers.pt"
                        ],
                        [
                            "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt",
                            "https://s3-us-east-1.amazonaws.com/us-east-1.rovers.pt"
                        ]
                    )
                );
                break;
            case "jobProcessorServiceUrl":
                services.push(new fims.Service(
                    "Job Processor Service",
                    [
                        new fims.ServiceResource("fims:JobProcess", serviceUrls[prop] + "/JobProcess")
                    ]
                ));
                break;
            case "jobRepositoryUrl":
                services.push(new fims.Service(
                    "Job Repository",
                    [
                        new fims.ServiceResource("fims:AmeJob", serviceUrls[prop] + "/Job"),
                        new fims.ServiceResource("fims:TransformJob", serviceUrls[prop] + "/Job")
                    ]
                ));
                break;
            case "serviceRegistryUrl":
                services.push(new fims.Service(
                    "Service Registry",
                    [
                        new fims.ServiceResource("fims:Service", serviceUrls[prop] + "/Service"),
                        new fims.ServiceResource("fims:JobProfile", serviceUrls[prop] + "/JobProfile")
                    ]
                ));
                break;
        }
    }

    return services;
}


var content = "";

process.stdin.on('data', (data) => {
    content += data.toString();
});

process.stdin.on('end', function () {
    var serviceUrls = {};

    var lines = content.split("\n");
    lines.forEach(line => {
        var parts = line.split(" = ");

        if (parts.length === 2) {
            serviceUrls[parts[0]] = parts[1];
        }
    });

    var servicesUrl = serviceUrls.serviceRegistryUrl + "/Service";

    fims.setServiceRegistryServicesURL(servicesUrl);

    return async.waterfall([
        (callback) => fims.getServices(callback),
        (services, callback) => {
            return async.each(services, (service, callback) => {
                console.log("Deleting service " + service.name);
                return fims.httpDelete(service.id, (err, service) => callback(err));
            }, callback);
        },
        (callback) => {
            return async.each(createServices(serviceUrls), (service, callback) => {
                console.log("Inserting service " + service.name);
                return fims.httpPost(servicesUrl, service, (err, service) => callback(err));
            }, callback);
        }
    ], (err) => {
        if (err) {
            console.error("Failed to update service registry due to error: " + err);
        } else {
            console.log("Successfully updated service registry at " + servicesUrl);
        }
    });
});