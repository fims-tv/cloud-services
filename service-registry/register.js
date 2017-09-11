var async = require("async");
var fims = require("fims-aws").CORE;


var jobProfiles = {
    ExtractTechnicalMetadata : new fims.JobProfile(
        "ExtractTechnicalMetadata",
        [
            new fims.JobParameter("ebucore:hasRelatedResource", "ebucore:BMEssence")
        ],
        [
            new fims.JobParameter("ebucore:locator")
        ]
    ),
}

function createServices(serviceUrls) {

    var serviceList = [];

    for (var prop in serviceUrls) {
        switch (prop) {
            case "ameServiceUrl":
                serviceList.push(
                    new fims.Service(
                        "MediaInfo AME Service",
                        [
                            new fims.ServiceResource("fims:JobAssignment", serviceUrls[prop] + "/JobAssignment")
                        ],
                        "fims:AmeJob",
                        [
                            jobProfiles.ExtractTechnicalMetadata.id ? jobProfiles.ExtractTechnicalMetadata.id : jobProfiles.ExtractTechnicalMetadata
                        ],
                        [
                            serviceUrls.publicBucketUrl,
                            serviceUrls.privateBucketUrl
                        ],
                        [
                            serviceUrls.publicBucketUrl,
                            serviceUrls.privateBucketUrl
                        ]
                    )
                );
                break;
            case "jobProcessorServiceUrl":
                serviceList.push(new fims.Service(
                    "Job Processor Service",
                    [
                        new fims.ServiceResource("fims:JobProcess", serviceUrls[prop] + "/JobProcess")
                    ]
                ));
                break;
            case "jobRepositoryUrl":
                serviceList.push(new fims.Service(
                    "Job Repository",
                    [
                        new fims.ServiceResource("fims:AmeJob", serviceUrls[prop] + "/Job"),
                        new fims.ServiceResource("fims:TransformJob", serviceUrls[prop] + "/Job")
                    ]
                ));
                break;
            case "mediaRepositoryUrl":
                serviceList.push(new fims.Service(
                    "Media Repository",
                    [
                        new fims.ServiceResource("ebucore:BMContent", serviceUrls[prop] + "/BMContent"),
                        new fims.ServiceResource("ebucore:BMEssence", serviceUrls[prop] + "/BMEssence")
                    ]
                ));
                break;
            case "serviceRegistryUrl":
                serviceList.push(new fims.Service(
                    "Service Registry",
                    [
                        new fims.ServiceResource("fims:Service", serviceUrls[prop] + "/Service"),
                        new fims.ServiceResource("fims:JobProfile", serviceUrls[prop] + "/JobProfile")
                    ]
                ));
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

    fims.setServiceRegistryServicesURL(servicesUrl);

    return async.waterfall([
        (callback) => fims.httpGet(jobProfilesUrl, callback),
        (retrievedJobProfiles, callback) => {
            async.each(retrievedJobProfiles, (retrievedJobProfile, callback) => {
                var jobProfile = jobProfiles[retrievedJobProfile.label];

                if (jobProfile && !jobProfile.id) {
                    jobProfile.id = retrievedJobProfile.id;

                    console.log("Updating JobProfile '" + jobProfile.label + "'");
                    fims.httpPut(jobProfile.id, jobProfile, callback);
                } else {
                    console.log("Removing " + (jobProfile.id ? "duplicate " : "" ) + "JobProfile '" + retrievedJobProfile.label + "'");
                    fims.httpDelete(retrievedJobProfile.id, callback);
                }
            }, callback);
        },
        (callback) => {
            async.each(jobProfiles, (jobProfile, callback) => {
                if (jobProfile.id) {
                    return callback();
                }

                console.log("Inserting JobProfile '" + jobProfile.label + "'");
                return fims.httpPost(jobProfilesUrl, jobProfile, (err, postedJobProfile) => {
                    jobProfile.id = postedJobProfile.id;
                    callback();
                });
            }, callback);
        },
        (callback) => {
            services = createServices(serviceUrls)
            fims.getServices(callback)
        },
        (retrievedServices, callback) => {
            return async.each(retrievedServices, (retrievedService, callback) => {
                var service = services[retrievedService.label];

                if (service && !service.id) {
                    service.id = retrievedService.id;

                    console.log("Updating Service '" + service.label + "'");
                    fims.httpPut(service.id, service, callback);
                } else {
                    console.log("Removing " + (service.id ? "duplicate " : "" ) + "Service '" + retrievedService.label + "'");
                    fims.httpDelete(retrievedService.id, callback);
                }
            }, callback);
        },
        (callback) => {
            async.each(services, (service, callback) => {
                if (service.id) {
                    return callback();
                }

                console.log("Inserting Service '" + service.label + "'");
                return fims.httpPost(servicesUrl, service, (err, postedService) => {
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