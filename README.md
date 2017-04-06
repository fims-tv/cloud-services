# aws-services

### Payload messages

1. Workflow Orchestration -> Job Repository: HTTP Request
```HTTP
POST /Job HTTP/1.1
Host: job-repository
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
  }
}
```

2. Job Repository -> Workflow Orchestration: HTTP Response to 1
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
  "jobStatus": "NEW",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```

3. Workflow Orchestration -> Job Processor: HTTP Request
```HTTP
POST /StartJob HTTP/1.1
Host: job-processor
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "type": "StartJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "priority": "MEDIUM",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  }
}
```

4. Job Processor -> Job Repository: HTTP Request
```HTTP
GET /Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14 HTTP/1.1
Host: job-repository
```

5. Job Repository -> Job Processor: HTTP Response to 4
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
  "jobStatus": "NEW",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```

6. Job Processor -> Job Repository: HTTP Request
```HTTP
POST /StartJob HTTP/1.1
Host: job-repository
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "type": "StartJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "priority": "MEDIUM",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  }
}
```

7. Job Repository -> Job Processor: HTTP Response to 6
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
  "priority": "MEDIUM",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  },
  "dateCreated": "2017-03-30T13:11:41.888Z",
  "dateModified": "2017-03-30T13:11:41.888Z"
}
```

8. Job Processor -> Job Repository: HTTP Request
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
  "jobStatus": "QUEUED",
  "startJob": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:40.078Z",
}
```

9. Job Repository -> Job Processor: HTTP Response to 8
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
  "jobStatus": "QUEUED",
  "startJob": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "dateCreated": "2017-03-30T13:11:40.078Z",
  "dateModified": "2017-03-30T13:11:41.078Z",
}
```

10. Job Processor -> Workflow Orchestration: HTTP Response to 3
```HTTP
HTTP/1.1 201 Created
Location: https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id": "https://job-repository/StartJob/02088b54-f5e0-405f-ba3a-34e5aa386a93",
  "type": "StartJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "priority": "MEDIUM",
  "asyncEndpoint": {
    "success": "https://workflow-orchestration/success",
    "failure": "https://workflow-orchestration/failure"
  },
  "dateCreated": "2017-03-30T13:11:41.888Z",
  "dateModified": "2017-03-30T13:11:41.888Z"
}
```

11. Job Processor -> AME service: HTTP Request
```HTTP
POST /ProcessJob HTTP/1.1
Host: ame-service
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "type": "ProcessJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "asyncEndpoint": {
      "update": "http://job-processor/UpdateJob",
      "success": "http://job-processor/StopJob",
      "failure": "http://job-processor/StopJob"
   }
}
```

12. AME service -> Job Processor
```HTTP
HTTP/1.1 201 Created
Location: /ProcessJob/12341234-f5e0-405f-ba3a-34e5aa386a93
Content-Type: application/json; charset=utf-8
Content-Length: xxx

{
  "@context": "https://job-repository/context/default",
  "id": "https://job-repository/StartJob/12341234-f5e0-405f-ba3a-34e5aa386a93",
  "type": "StartJob",
  "job": "https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14",
  "asyncEndpoint": {
      "update": "http://job-processor/UpdateJob",
      "success": "http://job-processor/StopJob",
      "failure": "http://job-processor/StopJob"
  },
  "dateCreated": "2017-03-30T13:11:41.888Z",
  "dateModified": "2017-03-30T13:11:41.888Z"
}
```
