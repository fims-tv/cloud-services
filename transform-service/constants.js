var INTERNAL = "###INTERNAL###";
var DEFAULT_CONTEXT = INTERNAL + "/context/default";
var CONTEXTS = {};

var EXPORT_CONTEXT = "###EXPORT###";

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
        "outputFile": {
            "@id": "ebucore:outputFile",
            "@type": "xsd:anyURI"
        }
    }
};

CONTEXTS[EXPORT_CONTEXT] = {
    "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
        "fims": "http://fims.tv#",
        "mediaInfo": "https://mediaarea.net#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "xsi": "http://www.w3.org/2001/XMLSchema-instance",
        
        "ebucore:hasVideoFormat": {
            "@id": "ebucore:hasVideoEncodingFormat",
            "@type": "xsd:string"
        },
        "ebucore:frameWidth": {
            "@id": "ebucore:frameWidth",
            "@type": "xsd:integer"
        },
        "ebucore:frameHeight": {
            "@id": "ebucore:frameHeight",
            "@type": "xsd:integer"
        },
        "ebucore:frameRate": {
            "@id": "ebucore:frameRate",
            "@type": "xsd:string"
        },
        "ebucore:hasVideoEncodingFormat": {
            "@id": "ebucore:hasVideoEncodingFormat",
            "@type": "xsd:string"
        },
        "ebucore:hasVideoCodec": {
            "@id": "ebucore:hasVideoCodec",
            "@type": "xsd:string"
        },
        "ebucore:videoBitRate": {
            "@id": "ebucore:videoBitRate",
            "@type": "xsd:integer"
        },
        "ebucore:videoBitRateMax": {
            "@id": "ebucore:videoBitRateMax",
            "@type": "xsd:integer"
        },
        "ebucore:videoBitRateMode": {
            "@id": "ebucore:videoBitRateMode",
            "@type": "xsd:string"
        },
        "ebucore:scanningFormat": {
            "@id": "ebucore:scanningFormat",
            "@type": "xsd:string"
        },
        "ebucore:hasVideoTrack": {
            "@id": "ebucore:hasVideoTrack",
            "@type": "@id"
        },
        "ebucore:trackNumber": {
            "@id": "ebucore:trackNumber",
            "@type": "xsd:integer"
        },
        "mediaInfo:Standard": {
            "@id": "mediaInfo:Standard",
            "@type": "xsd:string"
        },
        "mediaInfo:ColorSpace": {
            "@id": "mediaInfo:ColorSpace",
            "@type": "xsd:string"
        },
        "mediaInfo:colour_primaries": {
            "@id": "mediaInfo:colour_primaries",
            "@type": "xsd:string"
        },
        "mediaInfo:transfer_characteristics": {
            "@id": "mediaInfo:transfer_characteristics",
            "@type": "xsd:string"
        },
        "mediaInfo:matrix_coefficients": {
            "@id": "mediaInfo:matrix_coefficients",
            "@type": "xsd:string"
        },
        "mediaInfo:colour_range": {
            "@id": "mediaInfo:colour_range",
            "@type": "xsd:string"
        },
        "mediaInfo:VideoStreamSize": {
            "@id": "mediaInfo:VideoStreamSize",
            "@type": "xsd:integer"
        },
        "mediaInfo:BitDepth": {
            "@id": "mediaInfo:BitDepth",
            "@type": "xsd:integer"
        },
        "mediaInfo:CABAC": {
            "@id": "mediaInfo:CABAC",
            "@type": "xsd:boolean"
        },
        "mediaInfo:MBAFF": {
            "@id": "mediaInfo:MBAFF",
            "@type": "xsd:boolean"
        },

        "ebucore:hasAudioFormat": {
            "@id": "ebucore:hasAudioFormat",
            "@type": "xsd:string"
        },
        "ebucore:hasAudioEncodingFormat": {
            "@id": "ebucore:hasAudioEncodingFormat",
            "@type": "xsd:string"
        },
        "ebucore:hasAudioCodec": {
            "@id": "ebucore:hasAudioCodec",
            "@type": "xsd:string"
        },
        "ebucore:sampleRate": {
            "@id": "ebucore:sampleRate",
            "@type": "xsd:integer"
        },
        "ebucore:audioBitRate": {
            "@id": "ebucore:audioBitRate",
            "@type": "xsd:integer"
        },
        "ebucore:audioBitRateMax": {
            "@id": "ebucore:audioBitRateMax",
            "@type": "xsd:integer"
        },
        "ebucore:audioBitRateMode": {
            "@id": "ebucore:audioBitRateMode",
            "@type": "xsd:string"
        },
        "ebucore:hasAudioTrack": {
            "@id": "ebucore:hasAudioTrack",
            "@type": "@id"
        },
        "ebucore:trackId": {
            "@id": "ebucore:trackId",
            "@type": "xsd:integer"
        },
        "ebucore:hasLanguage": {
            "@id": "ebucore:hasLanguage",
            "@type": "xsd:string"
        },
        "ebucore:audioChannelNumber": {
            "@id": "ebucore:audioChannelNumber",
            "@type": "xsd:integer"
        },
        "mediaInfo:ChannelPositions": {
            "@id": "mediaInfo:ChannelPositions",
            "@type": "xsd:string"
        },
        "mediaInfo:ChannelLayout": {
            "@id": "mediaInfo:ChannelLayout",
            "@type": "xsd:string"
        },
        "mediaInfo:AudioStreamSize": {
            "@id": "mediaInfo:AudioStreamSize",
            "@type": "xsd:integer"
        },

        "ebucore:hasContainerFormat": {
            "@id": "ebucore:hasContainerFormat",
            "@type": "xsd:string"
        },
        "ebucore:hasContainerEncodingFormat": {
            "@id": "ebucore:hasContainerEncodingFormat",
            "@type": "xsd:string"
        },
        "ebucore:hasContainerCodec": {
            "@id": "ebucore:hasContainerCodec",
            "@type": "xsd:string"
        },
        "ebucore:durationNormalPlayTime": {
            "@id": "ebucore:durationNormalPlayTime",
            "@type": "xsd:duration"
        },
        "ebucore:fileSize": {
            "@id": "ebucore:fileSize",
            "@type": "xsd:integer"
        },
        "ebucore:filename": {
            "@id": "ebucore:filename",
            "@type": "xsd:string"
        },
        "ebucore:bitRateOverall": {
            "@id": "ebucore:bitRateOverall",
            "@type": "xsd:integer"
        },
        "ebucore:dateCreated": {
            "@id": "ebucore:dateCreated",
            "@type": "xsd:dateTime"
        },
        "ebucore:dateModified": {
            "@id": "ebucore:dateModified",
            "@type": "xsd:dateTime"
        },
    }
};

module.exports = {
    INTERNAL: INTERNAL,
    DEFAULT_CONTEXT: DEFAULT_CONTEXT,
    EXPORT_CONTEXT: EXPORT_CONTEXT,
    CONTEXTS: CONTEXTS
}