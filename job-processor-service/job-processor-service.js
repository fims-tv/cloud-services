//"use strict";
console.log('Loading function');

var FIMS = require("fims-aws");

var async = require("async");

exports.handler = FIMS.API.handler;
exports.FIMS = FIMS;

var originalBL = {
    accepts: FIMS.BL.accepts,
    get: FIMS.BL.get,
    post: FIMS.BL.post,
    put: FIMS.BL.put,
    del: FIMS.BL.del
};

FIMS.setLogger("error", console.error);
FIMS.setLogger("warn", console.warn);
FIMS.setLogger("log", console.log);

FIMS.BL.accepts = (event, resourceDescriptor, callback) => {
    switch (resourceDescriptor.type) {
        case "JobProcess":
            return callback();
    }
    return originalBL.accepts(event, resourceDescriptor, callback);
};

FIMS.BL.get = (event, resourceDescriptor, callback) => {
    return originalBL.get(event, resourceDescriptor, callback);
};

FIMS.BL.post = (event, resourceDescriptor, resource, callback) => {
    if (resourceDescriptor.type !== resource.type) {
        return callback("Failed to process POST of '" + resourceDescriptor.type + "' with resource type '" + resource.type);
    } else {
        return originalBL.post(event, resourceDescriptor, resource, (err, jobProcess) => {
            if (err) {
                return callback(err, jobProcess);
            }

            var job;
            var jobProcess = resource;
            var jobAssignment;

            var acceptingServices = [];

            async.waterfall([
                (callback) => { // retrieve the related job
                    return FIMS.DAL.get(event, jobProcess.job, (err, retrievedJob) => {
                        if (err) {
                            jobProcess.jobProcessStatus = "Failed";
                            jobProcess.jobProcessStatusReason = "Unable to retrieve job '" + jobProcess.job + "'";
                        } else {
                            job = retrievedJob;
                            job.jobProcess = jobProcess.id;
                        }
                        return callback(err);
                    });
                },
                (callback) => { // check if job is valid
                    return FIMS.CORE.isValidJob(job, (err) => {
                        if (err) {
                            jobProcess.jobProcessStatus = "Failed";
                            jobProcess.jobProcessStatusReason = err;
                            job.jobStatus = "Failed";
                            job.jobStatusReason = err;
                        }
                        return callback(err);
                    });
                },
                (callback) => { // find services that are able to process job
                    return FIMS.DAL.get(event, event.variables.ServiceRegistryUrl + "/Service", (err, services) => {
                        if (err) {
                            jobProcess.jobProcessStatus = "Failed";
                            jobProcess.jobProcessStatusReason = "Failed to retrieve services from service registry";
                            job.jobStatus = "Failed";
                            job.jobStatusReason = "Error in while processing job";
                            return callback(err);
                        }

                        return async.each(services, (service, callback) => {
                            return FIMS.CORE.canServiceAcceptJob(service, job, (err) => {
                                if (!err) {
                                    acceptingServices.push(service);
                                }
                                return callback();
                            });
                        }, () => {
                            if (acceptingServices.length === 0) {
                                jobProcess.jobProcessStatus = "Failed";
                                jobProcess.jobProcessStatusReason = "No accepting service available";
                                job.jobStatus = "Failed";
                                job.jobStatusReason = "No accepting service available";
                                return callback(jobProcess.jobProcessStatusReason);
                            }
                            return callback();
                        });
                    });
                },
                (callback) => { // create JobAssignment and send to one of the services
                    jobAssignment = new FIMS.CORE.JobAssignment(jobProcess.id);

                    var acceptingService;
                    var resourceUrl;

                    for (var i = 0; i < acceptingServices.length; i++) {
                        var service = acceptingServices[i];

                        if (service.hasResource) {
                            var hasResources = service.hasResource.constructor === Array ? Array.from(service.hasResource) : Array.of(service.hasResource);

                            hasResources.forEach(hasResource => {
                                if (hasResource.resourceType === "fims:JobAssignment") {
                                    resourceUrl = hasResource.httpEndpoint;
                                }
                            });

                            if (resourceUrl) {
                                acceptingService = service;
                            }
                        }
                    }

                    if (!resourceUrl) {
                        jobProcess.jobProcessStatus = "Failed";
                        jobProcess.jobProcessStatusReason = "No accepting service available";
                        job.jobStatus = "Failed";
                        job.jobStatusReason = "No accepting service available";
                        return callback(jobProcess.jobProcessStatusReason);
                    }

                    return FIMS.DAL.post(event, resourceUrl, jobAssignment, (err, updatedJobAssignment) => {
                        if (err) {
                            jobProcess.jobProcessStatus = "Failed";
                            jobProcess.jobProcessStatusReason = "Service '" + acceptingService.label + "' failed to accept JobAssignment";
                            job.jobStatus = "Failed";
                            job.jobStatusReason = "Error in while processing job";
                            return callback(jobProcess.jobProcessStatusReason);
                        }

                        jobAssignment = updatedJobAssignment;
                        jobProcess.jobAssignment = jobAssignment.id;

                        job.jobStatus = "Running";
                        jobProcess.jobProcessStatus = "Running";
                        callback();
                    });
                },

            ], (err) => {
                async.waterfall([
                    (callback) => {
                        if (job) {
                            return FIMS.DAL.put(event, job.id, job, (err, updatedJob) => {
                                if (err) {
                                    console.log("error updating job '" + job.id + "' due to error: " + err)
                                    if (jobProcess.jobProcessStatus !== "Failed") {
                                        jobProcess.jobProcessStatus = "Failed";
                                        jobProcess.jobProcessStatusReason = "Unable to update job '" + job.id + "'";
                                    }
                                }

                                if (jobProcess.jobProcessStatus === "Failed" && job.asyncEndpoint && job.asyncEndpoint.asyncFailure) {
                                    return FIMS.DAL.get(event, job.asyncEndpoint.asyncFailure, () => callback());
                                }

                                return callback();
                            });
                        } else {
                            return callback();
                        }
                    },
                    (callback) => originalBL.put(event, resourceDescriptor, jobProcess, callback)
                ], (err, jobProcess) => {
                    callback(err, jobProcess)
                });
            })
        });
    }
};


FIMS.BL.put = (event, resourceDescriptor, resource, callback) => {
    if (resourceDescriptor.type !== resource.type) {
        return callback("Failed to process PUT of '" + resourceDescriptor.type + "' with resource type '" + resource.type);
    } else {
        return async.waterfall([
            (callback) => {
                FIMS.DAL.get(event, resource.id, callback);
            },
            (jobProcess, callback) => {
                switch (jobProcess.jobProcessStatus) {
                    case "Running":
                        switch (resource.jobProcessStatus) {
                            case "Completed":
                            case "Failed":
                                jobProcess.jobProcessStatus = resource.jobProcessStatus;
                                return callback(null, jobProcess);
                        }
                }

                return callback("Cannot change status of job process from '" + jobProcess.jobProcessStatus + "' to '" + resource.jobProcessStatus + "'");
            },
            (jobProcess, callback) => {
                return FIMS.DAL.get(event, jobProcess.jobAssignment, (err, jobAssignment) => { callback(err, jobProcess, jobAssignment) });
            },
            (jobProcess, jobAssignment, callback) => {
                return FIMS.DAL.get(event, jobProcess.job, (err, job) => { callback(err, jobProcess, jobAssignment, job) });
            },
            (jobProcess, jobAssignment, job, callback) => {
                jobProcess.jobProcessStatusReason = jobAssignment.jobProcessStatusReason;

                job.jobStatus = jobProcess.jobProcessStatus;
                job.jobStatusReason = jobProcess.jobProcessStatusReason;
                job.jobOutput = jobAssignment.jobOutput;

                return FIMS.DAL.put(event, job.id, job, (err, updatedJob) => callback(err, jobProcess, jobAssignment, job));
            },
            // Disabled deleting of jobAssignment for easy inspection
            // (jobProcess, jobAssignment, job, callback) => {
            //     return FIMS.DAL.del(event, jobAssignment.id, (err, jobAssignment) => callback(err, jobProcess, jobAssignment, job));
            // },
            (jobProcess, jobAssignment, job, callback) => {
                jobProcess.jobAssignment = null;
                return originalBL.put(event, resourceDescriptor, jobProcess, (err, jobProcess) => callback(err, jobProcess, job));
            }
        ], (err, jobProcess, job) => {
            if (job && job.asyncEndpoint) {
                var url;

                switch (job.jobStatus) {
                    case "Completed":
                        url = job.asyncEndpoint.asyncSuccess;
                        break;
                    case "Failed":
                        url = job.asyncEndpoint.asyncFailure;
                        break;
                }

                if (url) {
                    return FIMS.DAL.get(event, url, () => callback(err, jobProcess));
                }
            }

            return callback(err, jobProcess);
        });
    }
};

FIMS.BL.del = (event, resourceDescriptor, callback) => {
    return originalBL.del(event, resourceDescriptor, callback);
};
