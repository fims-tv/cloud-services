//"use strict";

var jsonld = require("jsonld");

var internalContext = "###INTERNAL###/context/default";
var defaultContextURL = internalContext;

var contextCacheExpirationTime = 60000;
var contextCache = {};

contextCache[internalContext] = {
    context: {
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
            "id": "@id",
            "type": "@type",
            "dateCreated": {
                "@id": "ebucore:dateCreated",
                "@type": "xsd:dateTime"
            },
            "dateModified": {
                "@id": "ebucore:dateModified",
                "@type": "xsd:dateTime"
            },
            "label": "rdfs:label",
            "Service": "fims:Service",
            "url": "ebucore:locator",
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
            "failure": {
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
            "outputFile": {
                "@id": "ebucore:outputFile",
                "@type": "xsd:anyURI"
            },
        }
    }
}


function removeExpiredContexts() {
    for (url in contextCache) {
        if (contextCache[url].expirationTime && contextCache[url].expirationTime < Date.now()) {
            delete contextCache[url]
        }
    }
}

// grab the built-in node.js doc loader
var nodeDocumentLoader = jsonld.documentLoaders.node();

var customLoader = function (url, callback) {
    removeExpiredContexts();

    // check if url is in cache
    if (url in contextCache) {
        return callback(
            null, {
                contextUrl: null, // this is for a context via a link header
                document: contextCache[url].context, // this is the actual document that was loaded
                documentUrl: url // this is the actual context URL after redirects
            });
    }

    // call the underlining documentLoader using the callback API and store result in cache
    nodeDocumentLoader(url, function (err, result) {
        if (!err && result) {
            contextCache[url] = {
                context: result.document,
                expirationTime: Date.now() + contextCacheExpirationTime
            };
        }

        callback(err, result);
    });
};
jsonld.documentLoader = customLoader;

function getDefaultContext() {
    return getContext(defaultContextURL);
}

function getDefaultContextURL() {
    return defaultContextURL;
}

function setDefaultContextURL(url) {
    defaultContextURL = url;
};

function getContextCacheExpirationTime() {
    return contextCacheExpirationTime;
};

function setContextCacheExpirationTime(expirationTime) {
    contextCacheExpirationTime = expirationTime;
};

function getContext(url) {
    removeExpiredContexts();
    return contextCache[url].context;
};

function putContext(url, context) {
    contextCache[url] = {
        context: context
    }
};

function removeContext(url) {
    delete contextCache[url];
};

function compact(resource, context, callback) {
    if (!callback && typeof (context) === 'function') {
        callback = context;
        context = defaultContextURL;
    }

    return jsonld.compact(resource, context, callback);
};

module.exports = {
    getDefaultContext: getDefaultContext,
    getDefaultContextURL: getDefaultContextURL,
    setDefaultContextURL: setDefaultContextURL,
    getContextCacheExpirationTime: getContextCacheExpirationTime,
    setContextCacheExpirationTime: setContextCacheExpirationTime,
    getContext: getContext,
    putContext: putContext,
    removeContext: removeContext,
    compact: compact
}
