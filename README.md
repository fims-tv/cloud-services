# aws-services

### Payload messages
Note that this is work in progress.

1. Workflow Orchestration -> Job Processor: HTTP Request - Creating a new Job
```HTTP
POST /Job HTTP/1.1
Host: job-processor
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld"
}
```

2. Job Processor -> Job Repository: HTTP Request - Storing job in job-repository
```HTTP
POST /Job HTTP/1.1
Host: job-processor
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "NEW"
}
```

3. Job Repository -> Job Processor: HTTP Response to 2 - Acknowledgement from job-repository
```HTTP
HTTP/1.1 201 Created
Location: /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "NEW",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```


4. Job Processor -> Workflow Orchestration: HTTP Response to 1 - Acknowledgement from job-processor
```HTTP
HTTP/1.1 201 Created
Location: /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "id":  "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "NEW",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```

5. Workflow Orchestration -> Job Processor: HTTP Request - Creating a StartJob
```HTTP
POST /StartJob HTTP/1.1
Host: job-processor
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "type": "StartJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  }
}
```

6. Job Processor -> Job Repository: HTTP Request - Retrieving Job
```HTTP
GET /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14 HTTP/1.1
Host: job-repository
```

7. Job Repository -> Job Processor: HTTP Response to 6
```HTTP
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "NEW",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```

8. Job Processor -> Job Repository: HTTP Request - Storing StartJob in job-repository
```HTTP
POST /StartJob HTTP/1.1
Host: job-repository
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "type": "StartJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  }
}
```

9. Job Repository -> Job Processor: HTTP Response to 8
```HTTP
HTTP/1.1 201 Created
Location: /StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "type": "StartJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  },
  "dateCreated": "2017-03-30T13:11:41.888Z",
  "dateModified": "2017-03-30T13:11:41.888Z"
}
```

10. Job Processor -> Job Repository: HTTP Request - Update Job status to QUEUED
```HTTP
PUT /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14 HTTP/1.1
Host: job-repository
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "QUEUED",
  "startJob": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```

11. Job Repository -> Job Processor: HTTP Response to 10
```HTTP
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "QUEUED",
  "startJob": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:41.078Z",
}
```

12. Job Processor -> Workflow Orchestration: HTTP Response to 5
```HTTP
HTTP/1.1 201 Created
Location: /StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "id": "https://job-processor/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "type": "StartJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  },
  "dateCreated": "2017-03-30T13:11:41.888Z",
  "dateModified": "2017-03-30T13:11:41.888Z"
}
```

13. Job Processor -> AME service: HTTP Request - Informing AME service that it has work to do
```HTTP
POST /ProcessJob HTTP/1.1
Host: ame-service
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "type": "ProcessJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14"
}
```

14. AME service -> Job Processor: HTTP Response to 13 - Accepting the work
```HTTP
HTTP/1.1 201 Created
Location: /ProcessJob/6d634643-5236-4de1-8a02-e5466c632c18
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://ame-service/context/default",
  "id": "https://ame-service/ProcessJob/6d634643-5236-4de1-8a02-e5466c632c18",
  "type": "ProcessJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "dateCreated": "2017-03-30T13:11:42.888Z",
  "dateModified": "2017-03-30T13:11:42.888Z"
}
```

15. Job Processor -> Job Repository: HTTP Request - JobStatus is now RUNNING
```HTTP
PUT /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14 HTTP/1.1
Host: job-repository
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "RUNNING",
  "startJob": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:41.078Z",
}
```

16. Job Repository -> Job Processor: HTTP Response to 15
```HTTP
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "RUNNING",
  "startJob": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:43.078Z",
}
```

17. AME service -> Job Processor: HTTP Request - Updating job with intermediate / final results
```HTTP
PUT /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14 HTTP/1.1
Host: job-processor
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "id":  "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "COMPLETED",
  "startJob": "https://job-processor/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "report": {
    "type": "Report"
  },
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:43.078Z"
}
```

18. Job processor -> Job repository: HTTP Request - Storing Job update in job-repository
```HTTP
PUT /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14 HTTP/1.1
Host: job-repository
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "COMPLETED",
  "startJob": "https://job-processor/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "report": {
    "type": "Report"
  },
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:43.078Z"
}
```

19. Job Processor -> AME service: HTTP Response to 18
```HTTP
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id":  "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "COMPLETED",
  "startJob": "https://job-processor/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "report": {
    "type": "Report"
  },
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:44.078Z",
}
```


20. Job Processor -> AME service: HTTP Response to 17
```HTTP
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "id":  "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "type": "AmeJob",
  "jobProfile": {
    "label": "ExtractTechnicalMetadata",
    "type": "JobProfile"
  },
  "hasRelatedResource": {
    "type": "BMEssence",
    "locator": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
  },
  "outputFile": "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.metadata.jsonld",
  "jobStatus": "COMPLETED",
  "startJob": "https://job-processor/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "report": {
    "type": "Report"
  },
  "startJob": "https://job-processor/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:44.078Z",
}
```

21. AME service -> Job Processor: HTTP Request - Informing Job processor about completion or failure
```HTTP
POST /StopJob
Host: job-processor
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://ame-service/context/default",
  "id": "https://job-processor/StopJob/9b6549bc-3f9d-4c4d-8df4-6d49b29ffd27",
  "type": "StopJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "stopJobCause": "COMPLETED",
  "dateCreated": "2017-03-30T13:11:42.286Z",
  "dateModified": "2017-03-30T13:11:42.286Z"
}
```

22. Job processor -> Job repository: HTTP Request - Storing StopJob in job-repository
```HTTP
POST /StopJob
Host: job-repository
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://ame-service/context/default",
  "id": "https://job-processor/StopJob/9b6549bc-3f9d-4c4d-8df4-6d49b29ffd27",
  "type": "StopJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "stopJobCause": "COMPLETED",
  "dateCreated": "2017-03-30T13:11:42.286Z",
  "dateModified": "2017-03-30T13:11:42.286Z"
}
```

23. Job Repository -> Job Processor: HTTP Response to 22
```HTTP
HTTP/1.1 201 OK
Location: /StopJob/9b6549bc-3f9d-4c4d-8df4-6d49b29ffd27
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id": "https://job-repository/StopJob/9b6549bc-3f9d-4c4d-8df4-6d49b29ffd27",
  "type": "StopJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "stopJobCause": "COMPLETED",
  "dateCreated": "2017-03-30T13:11:45.286Z",
  "dateModified": "2017-03-30T13:11:45.286Z"
}
```

24. Job Processor -> AME service: HTTP Response to 21
```HTTP
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-processor/context/default",
  "id": "https://job-processor/StopJob/9b6549bc-3f9d-4c4d-8df4-6d49b29ffd27",
  "type": "StopJob",
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "stopJobCause": "COMPLETED",
  "dateCreated": "2017-03-30T13:11:45.286Z",
  "dateModified": "2017-03-30T13:11:45.286Z"
}
```

25. Job Processor -> Workflow Orchestration
```HTTP
POST /success
Host: workflow-orchestration
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "job": "https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14"
}
```
