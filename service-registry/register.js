var async = require("async");
var core = require("fims-aws").CORE;

var jobProfiles = {
    ExtractTechnicalMetadata: new core.JobProfile(
        "ExtractTechnicalMetadata",
        [
            new core.JobParameter("fims:inputFile", "fims:Locator"),
            new core.JobParameter("fims:outputLocation", "fims:Locator")
        ],
        [
            new core.JobParameter("fims:outputFile", "fims:Locator")
        ]
    ),
    CreateProxy: new core.JobProfile(
        "CreateProxy",
        [
            new core.JobParameter("fims:inputFile", "fims:Locator"),
            new core.JobParameter("fims:outputLocation", "fims:Locator")
        ],
        [
            new core.JobParameter("fims:outputFile", "fims:Locator")
        ]
    ),
    ExtractThumbnail: new core.JobProfile(
        "ExtractThumbnail",
        [
            new core.JobParameter("fims:inputFile", "fims:Locator"),
            new core.JobParameter("fims:outputLocation", "fims:Locator")
        ],
        [
            new core.JobParameter("fims:outputFile", "fims:Locator")
        ],
        [
            new core.JobParameter("ebucore:width"),
            new core.JobParameter("ebucore:height")
        ]
    ),

}

function createServices(serviceUrls) {

    var serviceList = [];

    for (var prop in serviceUrls) {
        switch (prop) {
            case "ameServiceUrl":
                serviceList.push(
                    new core.Service(
                        "MediaInfo AME Service",
                        [
                            new core.ServiceResource("fims:JobAssignment", serviceUrls[prop] + "/JobAssignment")
                        ],
                        "fims:AmeJob",
                        [
                            jobProfiles.ExtractTechnicalMetadata.id ? jobProfiles.ExtractTechnicalMetadata.id : jobProfiles.ExtractTechnicalMetadata
                        ],
                        [
                            new core.Locator({ "httpEndpoint" : serviceUrls.publicBucketUrl, "awsS3Bucket": serviceUrls.publicBucket }),
                            new core.Locator({ "httpEndpoint" : serviceUrls.privateBucketUrl, "awsS3Bucket": serviceUrls.privateBucket })
                        ],
                        [
                            new core.Locator({ "httpEndpoint" : serviceUrls.publicBucketUrl, "awsS3Bucket": serviceUrls.publicBucket }),
                            new core.Locator({ "httpEndpoint" : serviceUrls.privateBucketUrl, "awsS3Bucket": serviceUrls.privateBucket })
                        ]
                    )
                );
                break;
            case "jobProcessorServiceUrl":
                serviceList.push(new core.Service(
                    "Job Processor Service",
                    [
                        new core.ServiceResource("fims:JobProcess", serviceUrls[prop] + "/JobProcess")
                    ]
                ));
                break;
            case "jobRepositoryUrl":
                serviceList.push(new core.Service(
                    "Job Repository",
                    [
                        new core.ServiceResource("fims:AmeJob", serviceUrls[prop] + "/Job"),
                        new core.ServiceResource("fims:CaptureJob", serviceUrls[prop] + "/Job"),
                        new core.ServiceResource("fims:QAJob", serviceUrls[prop] + "/Job"),
                        new core.ServiceResource("fims:TransferJob", serviceUrls[prop] + "/Job"),
                        new core.ServiceResource("fims:TransformJob", serviceUrls[prop] + "/Job")
                    ]
                ));
                break;
            case "mediaRepositoryUrl":
                serviceList.push(new core.Service(
                    "Media Repository",
                    [
                        new core.ServiceResource("ebucore:BMContent", serviceUrls[prop] + "/BMContent"),
                        new core.ServiceResource("ebucore:BMEssence", serviceUrls[prop] + "/BMEssence")
                    ]
                ));
                break;
            case "serviceRegistryUrl":
                serviceList.push(new core.Service(
                    "Service Registry",
                    [
                        new core.ServiceResource("fims:Service", serviceUrls[prop] + "/Service"),
                        new core.ServiceResource("fims:JobProfile", serviceUrls[prop] + "/JobProfile")
                    ]
                ));
                break;
            case "transformServiceUrl":
                serviceList.push(
                    new core.Service(
                        "FFmpeg TransformService",
                        [
                            new core.ServiceResource("fims:JobAssignment", serviceUrls[prop] + "/JobAssignment")
                        ],
                        "fims:TransformJob",
                        [
                            jobProfiles.CreateProxy.id ? jobProfiles.CreateProxy.id : jobProfiles.CreateProxy,
                            jobProfiles.ExtractThumbnail.id ? jobProfiles.ExtractThumbnail.id : jobProfiles.ExtractThumbnail
                        ],
                        [
                            new core.Locator({ "httpEndpoint" : serviceUrls.publicBucketUrl, "awsS3Bucket": serviceUrls.publicBucket }),
                            new core.Locator({ "httpEndpoint" : serviceUrls.privateBucketUrl, "awsS3Bucket": serviceUrls.privateBucket })
                        ],
                        [
                            new core.Locator({ "httpEndpoint" : serviceUrls.publicBucketUrl, "awsS3Bucket": serviceUrls.publicBucket }),
                            new core.Locator({ "httpEndpoint" : serviceUrls.privateBucketUrl, "awsS3Bucket": serviceUrls.privateBucket })
                        ]
                    )
                );
                break;
        }
    }

    var services = {};

    serviceList.forEach(service => {
        services[service.label] = service;
    });

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
    var jobProfilesUrl = serviceUrls.serviceRegistryUrl + "/JobProfile";

    var services;

    core.setServiceRegistryServicesURL(servicesUrl);

    return async.waterfall([
        (callback) => core.httpGet(jobProfilesUrl, callback),
        (retrievedJobProfiles, callback) => {
            async.each(retrievedJobProfiles, (retrievedJobProfile, callback) => {
                var jobProfile = jobProfiles[retrievedJobProfile.label];

                if (jobProfile && !jobProfile.id) {
                    jobProfile.id = retrievedJobProfile.id;

                    console.log("Updating JobProfile '" + jobProfile.label + "'");
                    core.httpPut(jobProfile.id, jobProfile, callback);
                } else {
                    console.log("Removing " + (jobProfile.id ? "duplicate " : "") + "JobProfile '" + retrievedJobProfile.label + "'");
                    core.httpDelete(retrievedJobProfile.id, callback);
                }
            }, callback);
        },
        (callback) => {
            async.each(jobProfiles, (jobProfile, callback) => {
                if (jobProfile.id) {
                    return callback();
                }

                console.log("Inserting JobProfile '" + jobProfile.label + "'");
                return core.httpPost(jobProfilesUrl, jobProfile, (err, postedJobProfile) => {
                    jobProfile.id = postedJobProfile.id;
                    callback();
                });
            }, callback);
        },
        (callback) => {
            services = createServices(serviceUrls)
            core.getServices(callback)
        },
        (retrievedServices, callback) => {
            return async.each(retrievedServices, (retrievedService, callback) => {
                var service = services[retrievedService.label];

                if (service && !service.id) {
                    service.id = retrievedService.id;

                    console.log("Updating Service '" + service.label + "'");
                    core.httpPut(service.id, service, callback);
                } else {
                    console.log("Removing " + (service.id ? "duplicate " : "") + "Service '" + retrievedService.label + "'");
                    core.httpDelete(retrievedService.id, callback);
                }
            }, callback);
        },
        (callback) => {
            async.each(services, (service, callback) => {
                if (service.id) {
                    return callback();
                }

                console.log("Inserting Service '" + service.label + "'");
                return core.httpPost(servicesUrl, service, (err, postedService) => {
                    service.id = postedService.id;
                    callback();
                });
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