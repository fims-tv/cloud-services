var INTERNAL = "###INTERNAL###";
var DEFAULT_CONTEXT = INTERNAL + "/context/default";
var CONTEXTS = {};

CONTEXTS[DEFAULT_CONTEXT] = {
    "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "default": "urn:ebu:metadata-schema:ebuCore_2012",
        "ebu": "http://ebu.org/nar-extensions/",
        "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
        "fims": "http://fims.tv#",
        "owl": "http://www.w3.org/2002/07/owl#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "dateCreated": {
            "@id": "ebucore:dateCreated",
            "@type": "xsd:dateTime"
        },
        "dateModified": {
            "@id": "ebucore:dateModified",
            "@type": "xsd:dateTime"
        },
        "id": "@id",
        "type": "@type",
        "label": "rdfs:label",
        "jobStatus": {
            "@id": "ebucore:jobStatus",
            "@type": "xsd:string"
        },
        "Job": "ebucore:Job",
        "AmeJob": "ebucore:AmeJob",
        "TransformJob": "ebucore:TransformJob",
        "job": {
            "@id": "ebucore:job",
            "@type": "@id"
        },
        "JobProfile": "ebucore:JobProfile",
        "jobProfile": {
            "@id": "ebucore:jobProfile",
            "@type": "@id"
        },
        "BMEssence": "ebucore:BMEssence",
        "hasRelatedResource": {
            "@id": "ebucore:hasRelatedResource",
            "@type": "@id"
        },
        "locator": {
            "@id": "ebucore:locator",
            "@type": "xsd:anyURI"
        },
        "StartJob": "ebucore:StartJob",
        "startJob": {
            "@id": "ebucore:startJob",
            "@type": "@id"
        },
        "asyncEndpoint": "ebucore:asyncEndpoint",
        "success": {
            "@id": "ebucore:asyncEndpointSuccess",
            "@type": "xsd:anyUri"
        },
        "failure":  {
            "@id": "ebucore:asyncEndpointFailure",
            "@type": "xsd:anyUri"
        },
        "priority": {
            "@id": "ebucore:JobPriority",
            "@type": "xsd:string"
        },
        "ProcessJob": "ebucore:ProcessJob",
        "processJob": {
            "@id": "ebucore:processJob",
            "@type": "@id"
        },
        "StopJob": "ebucore:StopJob",
        "stopJob": {
            "@id": "ebucore:stopJob",
            "@type": "@id"
        },
        "stopJobCause": {
            "@id": "ebucore:stopJobCause",
            "@type": "xsd:string"
        },
        "stopJobError": {
            "@id": "ebucore:stopJobError",
            "@type": "xsd:string"
        },
        "Report": "ebucore:Report",
        "report": {
            "@id": "ebucore:Report",
            "@type": "@id"
        },
        "TechnicalMetadata": "ebucore:TecnicalMetadata",
        "technicalMetadata": {
            "@id": "ebucore:TecnicalMetadata",
            "@type": "@id"
        },
    }
};

module.exports = {
    INTERNAL: INTERNAL,
    DEFAULT_CONTEXT: DEFAULT_CONTEXT,
    CONTEXTS: CONTEXTS
}
