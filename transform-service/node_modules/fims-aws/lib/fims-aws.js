//"use strict";

var AWS = require("aws-sdk");
var JSONLD = require("fims-jsonld");

var API = require("./api-layer.js");
var BL = require("./business-layer.js");
var DAL = require("./data-access-layer.js");
var REP = require("./repository-layer.js");

API.setBL(BL);
API.setJSONLD(JSONLD);
BL.setDAL(DAL);
DAL.setREP(REP);
DAL.setJSONLD(JSONLD);
REP.setAWS(AWS);

function setLogger(level, logger) {
    API.logger.setLogger(level, logger);
    BL.logger.setLogger(level, logger);
    DAL.logger.setLogger(level, logger);
    REP.logger.setLogger(level, logger);
}

module.exports = {
    AWS: AWS,
    JSONLD: JSONLD,
    API: API,
    BL: BL,
    DAL: DAL,
    REP: REP,
    setLogger: setLogger
}
