// Copyright (C) 2016 Louis de Charsonville
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3 as
// published by the Free Software Foundation.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
// =====================================================================

// PACKAGES
var xml2js = require('xml2js'),
    http = require('follow-redirects').http,
    https = require('https'),
    url = require('url'),
    fs = require('fs'),
    buildHTML = require('./buildHTML'),
    request = require('request'),
    debug = require('debug')('fetcher'),
    amqp = require('amqplib/callback_api'),
    shortid = require('shortid');

const providers = require('./providers.json');


// RABBIT MQ
var urlrabbit = process.env.CLOUDAMQP_URL || "amqp://localhost",
    q = 'tasks',
    dirTempFiles = './../public/temp/';

// Utilitaries
function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

function getErrorMessage(errorCode) {
    var message = '';
    if (errorCode === 500) {
        message = 'Internal Server Error';
        return message;
    } else {
        return message;
    }
}

function isInArray(it,arr) {
    return arr.indexOf(it) > -1;
}

// On récupére le nom de l'agence que l'on utilise pour récupérer la DSD d'un dataset
function getAgency(provider,dataset,callback) {
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID;
    var myPath = path + 'dataflow/' + agencyID +'/'+dataset + '?'+ format;
    var options = {
        url: protocol+'://'+host+myPath,
        method: 'GET',
        headers: {
            'connection' : 'keep-alive',
            'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
            'user-agent': 'nodeJS'
        }
    };
    debug('call getAgency; provider: %s, dataset: %s',provider,dataset);
    debug('url: %s',options.url);
    request(options,function(e,r,b) {
        if (r.statusCode >=200 && r.statusCode < 400 && !e) {
            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                if (err === null) {
                    try {
                        var agency = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'][0]['Structure']['0']['Ref'][0]['agencyID'],
                            dsdId = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'][0]['Structure']['0']['Ref'][0]['id'];
                        callback(false,{"agency":agency,"dsdId":dsdId});
                        debug('agency: %s; dsdId: %s',agency, dsdId);
                        debug('getAgency: done.');
                    } catch(error) {
                        var errorMessage = "Error parsing SDMX when retrieving datastructure at: "+ options.url;
                        callback(true,errorMessage);
                        debug(error);
                    }
                } else {
                    var errorMessage = "Error retrieving datastructure at: "+ options.url;
                    callback(true,errorMessage);
                };
            });
        } else {
            var errorMessage = "Error " + r.statusCode + " retrieving datastructure at: " + options.url;
            callback(true,errorMessage);
            debug(r.statusCode);
        }
    });
};

// Get dimension of the data using its datastructure
function getDim(provider, agency, dsdId, dataset, callback) {
    var nbDim = 0,
        arrDim = [];
    debug('call getDim with provider=%s, agency=%s, dsdId=%s, dataset=%s',provider,agency,dsdId,dataset);
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format;
    if ((agency === null && dsdId === null) && dataset !== null) {
        getAgency(provider,dataset,function(err,agencyInfo) {
            if (err) {
                callback(true,agencyInfo);
            } else {
                var myPath = path + 'datastructure/'+agencyInfo.agency+'/'+agencyInfo.dsdId + '?'+ format;
                var options = {
                    url: protocol + '://' + host + myPath,
                    method: 'GET',
                    headers: {
                        'connection' : 'keep-alive',
                        'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                request(options,function(e,r,b) { // e: error, r: response, b:body
                    if (r.statusCode >=200 && r.statusCode < 400 && !e) {
                        xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err === null) {
                                try {
                                    var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                                    nbDim = data.length;
                                    data.forEach(function(item,index) {
                                        arrDim.push(item['id'][0]);
                                    });
                                    debug('nbDim: %s ; arrDim: %s, dsdId: %s',nbDim,arrDim,dsdId);
                                    callback(false,{"nbDim": nbDim,"arrDim":arrDim,"data":data,"dsdId":agencyInfo.dsdId});
                                } catch(error) {
                                    var errorMessage = "Failed to retrieve dimensions - could not parse SDMX answer at: "+options.url;
                                    debug(error);
                                    callback(true,errorMessage);
                                }
                            } else {
                                var errorMessage = "Failed to retrieve dimensions - error when retrieving data at: "+options.url;
                                debug(err);
                                callback(true, errorMessage);
                            }
                        });
                    } else {
                        var errorMessage = "Failed to retrieve dimensions - error when retrieving data at: "+options.url;
                        callback(true, errorMessage);
                        debug(errorMessage);
                        debug(e);
                    } 
                });
            }});
    } else if (agency === null && dataset === null) {
        callback(true,"no agency nor dataset provided");
    } else if (agency !== null && dsdId !== null) {
        var myPath = path + 'datastructure/'+agency+'/'+dsdId + '?' + format;
        var options = {
            url: protocol + '://' + host + myPath,
            method: 'GET',
            headers: {
                'connection' : 'keep-alive',
                'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        request(options, function(e,r,b) {
            if (r.statusCode >=200 && r.statusCode < 400 && !e) {
                xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err === null) {
                        try {
                            var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                            nbDim = data.length;
                            data.forEach(function(item,index) {
                                arrDim.push(item['id'][0]);
                            });
                            callback(false,{"nbDim": nbDim,"arrDim":arrDim,"data":data});
                        } catch(error) {
                            var errorMessage = "Failed to retrieve dimensions - could not parse SDMX answer "+options.url;
                            debug(error);
                            callback(true, errorMessage);
                        }
                    } else {
                        var errorMessage = "Failed to retrieve dimensions - error when retrieving data at: "+options.url;
                        debug(err);
                        callback(true, errorMessage);
                    }
                });
            } else {
                var errorMessage = "Failed to retrieve dimensions - error when retrieving data at: "+options.url;
                debug(e);
                callback(true, errorMessage);
            }
        });           
    }
};

// ====================================== ROUTES ======================================

// List the datasets of a provider
exports.getAllDataFlow = function(req,res) {
    var provider = req.params.provider;
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID;
    
    if (isInArray(provider.toUpperCase(),Object.keys(providers))) {
        var myPath = path + 'dataflow/' + agencyID+ '?' + format;
        var options = {
            url: protocol + '://'+ host + myPath,
            headers: {
                'connection':'keep-alive',
                'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        debug('get dataflow with path=%s',options.url);
        request(options,function(e,r,b) {
            if (r.statusCode >=200 && r.statusCode < 400 && !e) {
                    xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if (err === null) {
                            var data = [];
                            try {
                                obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'].forEach(function(it,ind){
                                    var datasetId = it.id,
                                        dsdId = it.Structure[0]['Ref'][0]['id'],
                                        agency = it.Structure[0]['Ref'][0]['agencyID'],
                                        name = it.Name; //[0]['_']
                                    if (name.length > 1) {
                                        name.forEach(function(item,index){
                                            switch (item['xml:lang'][0]) {
                                            case 'fr':
                                                name = it.Name[index]['_'];
                                                break;
                                            case 'en':
                                                name = it.Name[index]['_'];
                                                break;
                                            default:
                                                name = it.Name[0]['_'];
                                            }
                                        });
                                    } else {name = it.Name[0]['_'];}
                                    data.push([datasetId,dsdId,agency,name,provider]);
                                });
                                res.send(buildHTML.dataFlow(data,provider));
                            }
                            catch(error) {
                                res.status(500).send('Failed to retrieve dataflows. Could not parse SDMX answer at '+options.url);
                                debug(error);
                            }
                        } else {
                            res.send(err);
                        }
                    });
            } else {
                res.send(r.statusCode);
            }
        });
    } else {
        res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED.');
    }
};



// List the timeseries inside a dataset

exports.getDataFlow = function(req,res) {
    var provider = req.params.provider.toUpperCase(),
        dataSet = req.params.dataset,
        myTimeout = req.query.timeout;
    if (myTimeout === undefined) {
        myTimeout = 5000;
    } else {
        myTimeout = +myTimeout;
    }
    debug('getDataflow with provider:%s, dataset:%s, timeout:%s',provider,dataSet,myTimeout);
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID,
        nodata = providers[provider.toUpperCase()].nodata;
    
    if (isInArray(provider.toUpperCase(),Object.keys(providers))) {
        getDim(provider,null,null,dataSet,function(err,dim) {
            if (err) {
                res.status(500).send(dim); // if err, dim is the error message
            } else {
                if (provider === 'WEUROSTAT') {
                    var myPath = path + providers[provider].agencyID + '/data/' + dataSet + '/all?detail=nodata' + '&' + format;
                }
                else {
                    if (nodata === 'True') {
                        var myPath = path + 'data/' + dataSet + '?detail=nodata&' + format;
                    } else {
                        var myPath = path + 'data/' + dataSet + '?' + format;   
                    }
                }
                var options = {
                    url: protocol + '://' +  host + myPath,
                    method: 'GET',
                    timeout: myTimeout,
                    headers: {
                        'connection': 'keep-alive',
                        'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                debug('get dataflow with path=%s | timeout=%o',options.url,options.timeout);
                if (debug.enabled) {var start = Date.now();}
                request(options,function(e,r,b) {
                    if (debug.enabled) {clearInterval(interval);}
                    if (!e) {
                        if (r.statusCode >= 200 && r.statusCode < 400) {
                            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj) {
                                if (err === null) {
                                    try {
                                        var footer =  obj.StructureSpecificData.Footer;
                                        try { footer = footer[0].Message[0].code[0];}
                                        catch(error) {}
                                        finally {
                                            if (footer == '413') {
                                                var errorFooter413 = '413 | Dataset is too big to retreive'; // Eurostat is sending error 413 in the footer...
                                                res.send(buildHTML.detailDataset(provider,null,dataSet,dim,errorFooter413));
                                            } else if (footer != null) {
                                                res.status(footer).send('ERROR | Code : '+ footer + ' ' + getErrorMessage(footer));
                                            } else {                   
                                                var data = obj.StructureSpecificData.DataSet[0];
                                                var vTS = data.Series;
                                                if (!res.headersSent) {
                                                    res.send(buildHTML.detailDataset(provider,vTS,dataSet,dim,null));
                                                };}}
                                    } catch(error) {
                                        var errorMessage = "Error retrieving data at: " + options.url;
                                        debug(errorMessage);
                                        debug('-------------------------');
                                        debug(error);
                                        res.status(500).send(errorMessage);
                                    }
                                }
                                else {
                                    res.send(err);
                                }
                            });
                        } else {
                            if (!res.headersSent) {
                                var myError = 'Response Code: ' + r.statusCode;
                                res.send(buildHTML.detailDataset(provider,null,dataSet,dim,myError));
                            }
                        }
                    } else if (e.code === 'ETIMEDOUT' || e.code === 'ESOCKETTIMEDOUT') {
                        var errorDatasetTooBig = 'the dataset is too big to retrieve all the timeseries. You can increase timeout by adding "?timeout=" at the end of the url (default is 5000ms)';
                        if (!res.headersSent) {
                            res.send(buildHTML.detailDataset(provider,null,dataSet,dim,errorDatasetTooBig));
                        }
                    } else {
                        if (!res.headersSent) {
                            var error = r.statusMessage;
                            debug(e);
                            debug(error);
                            debug(e.stack);
                            res.send(buildHTML.detailDataset(provider,null,dataSet,dim,error));
                        }
                    }
                });
                if (debug.enabled){
                    var interval = setInterval(function(){
                        console.log('Waiting: ', (Date.now() - start) / 1000);
                    }, 1000);
                }
            }});
    } else {res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED');}
};

// Download a Dataset

// Parameters :
// There are two kind of parameters, both are passed into the URL by the user
// - Dimensions of the datasets : like frequency, geo, etc.
// - Filters : like startPeriod, endPeriod, etc
// Both should not be passed the same way to sdmx providers:
// - Dimensions should be ordered and separated by dots and are parts of the path.
// - Filters are separated by & and passed as standards params in the URL (ie: ?name=value)
// NAME OF VARIABLES :
// + reqParams = dictionnary of all params passed by the user
// + authParams = array of the set of dimensions of the dataset (retreived with getDim)
// + dimRequested = string of the ordered dimensions separated by dots passed by the
//                  use. dimRequested should be a sub-set of authParams.

exports.getDataSet = function(req,res) {    
    var provider = req.params.provider.toUpperCase();
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID;
    if (isInArray(provider,Object.keys(providers))) {
        var dataSet = '';
        if (provider !== 'EUROSTAT' && provider !== 'WEUROSTAT')  {
            dataSet = req.params.dataset.toUpperCase();
        } else {
            dataSet = req.params.dataset;        
        };
        
        // All keys to UpperCase
        var key, keys = Object.keys(req.query);
        var n = keys.length;
        var reqParams={};
        while (n--) {
            key = keys[n];
            var kkey = key; // name of the key before it get changed below
            if (key.toUpperCase() === "FREQUENCY") {key = "FREQ";}
            if (key === 'startPeriod') {reqParams[key] = req.query[key];}
            else if (key === 'firstNObservations') {reqParams[key] = req.query[key];}
            else if (key === 'lastNObservations') {reqParams[key] = req.query[key];}
            else if (key === 'endPeriod') {reqParams[key] = req.query[key];}
            else {reqParams[key.toUpperCase()] = req.query[kkey];}
        }      
        var dimRequested = ''; // string fill with ordered dimensions passed by the user in req.params
        if (provider === 'WEUROSTAT') {
            var myPath = providers[provider].path + providers[provider].agencyID + '/data/' + dataSet;
        } else {
            var myPath = providers[provider].path + 'data/' + dataSet;
        }
        debug('getDataset with provider: %s, dataset: %s',provider,dataSet);
        debug('getDataset with path=%s',myPath);
        getDim(provider, null, null, dataSet, function(err,dim) {
            if (err) {
                res.status(500).send(dim); // if err, dim is the errorMessage
            } else {
                var authParams = dim.arrDim; // Authorised dimensions for the dataset.
                var compt = 0;
                authParams.forEach(function(it,ind){
                    if(reqParams[it] != null) {
                        if(ind<dim.nbDim-1) {dimRequested += reqParams[it]+'.';}
                        else { dimRequested += reqParams[it];}
                        delete reqParams[it];}
                    else {
                        if (ind<dim.nbDim-1) {
                            dimRequested += '.';
                        }
                        compt ++;
                    }
                });
                // When the whole dataSet is requested.
                if (compt == dim.nbDim) {
                    dimRequested = 'all';
                };
                myPath += '/' + dimRequested;

                Object.keys(reqParams).forEach(function(it,ind,arr) {
                    if (ind === 0) {
                        myPath += '?';
                    }
                    myPath += it.toString() + "=" + reqParams[it] ;
                    if (ind < arr.length-1) {
                        myPath += "&";
                    }
                });
                var options = {
                    url: protocol + '://' + host + myPath,
                    headers: {
                        'connection': 'keep-alive',
                        'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                debug('auth params: %s',authParams);
                debug('dimensions: %s',dimRequested);
                request(options, function(e,r,b) {
                    if (r.statusCode >= 200 && r.statusCode < 400) {
                        xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                                if(err === null) {
                                    try {
                                        var data = obj.StructureSpecificData.DataSet[0];
                                        var vTS = data.Series; // vector of Time Series : vTS
                                        if (!req.timedout) {
                                            res.send(buildHTML.makeTable(vTS,dataSet,authParams));
                                        }
                                    } catch(error) {
                                        debug(error);
                                        try {
                                            var footer = obj.StructureSpecificData.Footer[0].Message[0].code[0]; // for handling Eurostat errors
                                            if (footer === '413') {
                                                res.redirect('/413.html');
                                                debug('redirecting to 413');
                                            } else {
                                                var errorMessage = "Error parsing SDMX at: " + options.url;
                                                res.status(500).send(errorMessage);
                                                debug(errorMessage);
                                            }
                                        } catch(error2) {
                                            debug(error2);
                                            var errorMessage = "Error parsing SDMX at: " + options.url;
                                            res.status(500).send(errorMessage);
                                        }
                                    }
                                } else {
                                    res.send(err);
                                }
                            });
                    } else if (r.statusCode === 413) {
                        res.redirect('/413.html');
                    } else {
                        var errorMessage = "Error retrieving data at: " + options.url + '\n';
                        errorMessage += 'Code: ' + r.statusCode + '\n';
                        errorMessage += 'Message: ' + r.statusMessage;
                        res.status(r.statusCode).send(errorMessage);
                        debug(r);
                    }
                });
            }});
    } else {
        res.status(404).send("ERROR 404 - PROVIDER IS NOT SUPPORTED");
    }
};

exports.getSeries = function(req,res) {
    var series = req.params.series,
        provider = req.params.provider.toUpperCase();
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID;
    if (isInArray(provider,Object.keys(providers))) {
        var keys = Object.keys(req.query);
        var params = "?";
        keys.forEach(function(it,ind,arr) {
            params += it.toString() + "=" + req.query[it] ;
            if (ind<arr.length-1) {
                params += "&";
            }
        });
        if (keys.length > 0) {
            params += '&' + format;
        } else {
            params += format;
        }
        if (provider == "INSEE") {
            var myPath = '/series/sdmx/data/SERIES_BDM/'+series+params;
            var options = {
                url: protocol + '://' + host + myPath,
                method: 'GET',
                headers: {
                    'connection': 'keep-alive',
                    'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
                }
            };
            debug('getSeries with path=%s',options.url);
            request(options, function(e,r,b) {
                if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
                        xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err === null) {
                                try {
                                    var data = obj.StructureSpecificData.DataSet[0];
                                    var vTS = data.Series;
                                    if (!req.timedout) {
                                        res.send(buildHTML.makeTable(vTS,series,[]));
                                    }}
                                catch(error) {
                                    debug(error);
                                    var errorMessage = "Error parsing SDMX at: " + options.url;
                                    res.status(500).send(errorMessage);
                                }
                            } else{
                                res.send(err);
                            }
                        });
                } else {
                    res.status(r.statusCode).send(r.statusMessage);
                    debug(e);
                }
            });        
        } else {
            var arr = series.split('.'),
                dataSet = arr[0];
            arr.shift();
            var userParams = arr.join('.');
            if (provider.toUpperCase() === 'WEUROSTAT') {
                var myPath = path + providers[provider].agencyID + '/data/' + dataSet+'/' + userParams + params;
            } else {
                var myPath = path + 'data/' + dataSet + '/'+ userParams + params;
            }
            var options = {
                url: protocol + '://' + host + myPath,
                method: 'GET',
                headers: {
                    'connection': 'keep-alive',
                    'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                    'user-agent': 'nodeJS'
                }
            };
            request(options, function(e,r,b) {
                if (r.statusCode >= 200 && r.statusCode < 400) {
                        xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err === null) {
                                try {
                                    var data = obj.StructureSpecificData.DataSet[0];
                                    var vTS = data.Series;
                                    if (!req.timedout) {
                                        res.send(buildHTML.makeTable(vTS,series,[]));
                                    }
                                }
                                catch(error) {
                                    debug(error);
                                    var errorMessage = "Error parsing SDMX at: " + options.url;
                                    res.status(500).send(errorMessage);
                                }
                            } else {
                                res.send(err);
                            }
                        });
                } else {
                    res.status(r.statusCode).send(r.statusMessage);
                    debug(e);
                }
            });
        };
    } else {
        res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED');
    }
};

exports.getCodeList = function(req,res) {

    var provider = req.params.provider.toUpperCase(),
        dim = req.params.codelist,
        dsdId = req.query.dsdId;

    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID;
    
    if (isInArray(provider,Object.keys(providers))) {
        if (provider === 'EUROSTAT') {
            var myPath = path + 'datastructure/'+ agencyID + '/' + dsdId + '?' + format;
        } else {
            var myPath = path + 'codelist/' + agencyID + '/' + dim + '?' + format;
        }
        var options = {
            url: protocol + '://' + host + myPath,
            method: 'GET',
            headers: {
                'connection': 'keep-alive',
                'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        debug('getCodeList with provider: %s; dim: %s, dsdId: %s',provider,dim,dsdId);
        debug('url: %s', options.url);
        request(options, function(e,r,b) {
            if (r.statusCode >=200 && r.statusCode < 400 && !e) {
                xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err === null) {
                        try {
                            var data = obj['Structure']['Structures'][0]['Codelists'][0]['Codelist'];
                            if (data.length > 1) {
                                for(var d in data){
                                    if (data[d].id[0] === dim) {
                                        myData = data[d];
                                    }
                                }
                            } else {
                                var myData = data[0];
                            }
                            var title_dim = myData['id'][0];
                            var codes = myData['Code'];
                            debug('getCodeList: done;');
                            res.send(buildHTML.codeList(codes,title_dim));}
                        catch(error) {
                            var errorMessage = "Error parsing SDMX at: " + options.url;
                            res.status(500).send(errorMessage);
                            debug(error);
                        }
                    } else {
                        res.send(err);
                    }
                });
            } else {
                res.status(r.statusCode).send(r.statusMessage);
                debug(e);
            }
        });                   
    } else {
        res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED');
    }
};

// Retrieve data from SDMX URL
exports.getDatafromURL = function(req,res) {    
    var myUrl = req.query.url.replace(/\'*/g,"").replace(/\s/g,'+'); // remove ''
    var host = url.parse(myUrl).hostname,
        protocol = url.parse(myUrl).protocol,
        path = url.parse(myUrl).pathname;
    debug("Receive request for host: %s, with path: %s, over protcol: %s",host,protocol,path);  
    var options = {
        url: protocol+'//'+host+path,
        method: 'GET',
        headers: {
            'connection': 'keep-alive',
            'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
            'user-agent': 'nodeJS'
        },
        agentOptions: {
            ciphers: 'ALL',
            secureProtocol: 'TLSv1_1_method'
        }
    };
    request(options,function(e,r,b) {
        if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
                    xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err === null) {
                            try {
                                if (typeof obj.StructureSpecificData !== 'undefined') {
                                    var data = obj.StructureSpecificData.DataSet[0],
                                        vTS = data.Series,
                                        title = 'request to '+ host;
                                    if (!req.timedout) {
                                        res.send(buildHTML.makeTable(vTS,title,[]));
                                    }
                                } else {
                                    res.set('Content-type','text/plain');
                                    res.send('The request could not be handled');
                                }
                            } catch(error) {
                                debug(error);
                                var errorMessage = "Error parsing SDMX at: " + options.url;
                                res.status(500).send(errorMessage);
                            }
                        } else {
                            res.send(err);
                        }
                    });
            } else {
                res.send(r.statusCode);
            }
        });
};


exports.redirectURL = function(req,res) {
    var myUrl = req.body.myUrl;
    var route = "/req?url='" + myUrl + "'";
    res.redirect(route);
};

// exports.getProviders = function(req,res) {
//     res.send(buildHTML.listProviders(providers));
// };


exports.getList = function(req,res) {    
    var provider = req.params.provider.toUpperCase();
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID,
        nodata = providers[provider.toUpperCase()].nodata;
    if (isInArray(provider,Object.keys(providers))) {
        var dataSet = '';
        if (provider !== 'EUROSTAT' && provider !== 'WEUROSTAT')  {
            dataSet = req.params.dataset.toUpperCase();
        } else {
            dataSet = req.params.dataset;        
        };
        
        // All keys to UpperCase
        var key, keys = Object.keys(req.query);
        var n = keys.length;
        var reqParams={};
        while (n--) {
            key = keys[n];
            var kkey = key; // name of the key before it get changed below
            if (key.toUpperCase() === "FREQUENCY") {key = "FREQ";}
            else {reqParams[key.toUpperCase()] = req.query[kkey];}
        }      
        var dimRequested = ''; // string fill with ordered dimensions passed by the user in req.params
        if (provider === 'WEUROSTAT') {
            var myPath = providers[provider].path + providers[provider].agencyID + '/data/' + dataSet;
        } else {
            var myPath = providers[provider].path + 'data/' + dataSet;
        }
        debug('getDataset with provider: %s, dataset: %s',provider,dataSet);
        debug('getDataset with path=%s',myPath);
        getDim(provider, null, null, dataSet, function(err,dim) {
            if (err) {
                res.status(500).send(dim); // if err, dim is the errorMessage
            } else {
                var authParams = dim.arrDim; // Authorised dimensions for the dataset.
                var compt = 0;
                authParams.forEach(function(it,ind){
                    if(reqParams[it] != null) {
                        if(ind<dim.nbDim-1) {dimRequested += reqParams[it]+'.';}
                        else { dimRequested += reqParams[it];}
                        delete reqParams[it];}
                    else {
                        if (ind<dim.nbDim-1) {
                            dimRequested += '.';
                        }
                        compt ++;
                    }
                });
                // When the whole dataSet is requested.
                if (compt == dim.nbDim) {
                    dimRequested = 'all';
                };
                myPath += '/' + dimRequested;
                if (nodata === 'True') {
                    myPath += '?detail=nodata&';
                } else {
                    myPath += '?';
                }
                Object.keys(reqParams).forEach(function(it,ind,arr) {
                    if (ind === 0) {
                        myPath += '?';
                    }
                    myPath += it.toString() + "=" + reqParams[it] ;
                    if (ind < arr.length-1) {
                        myPath += "&";
                    }
                });
                var options = {
                    url: protocol + '://' + host + myPath,
                    headers: {
                        'connection': 'keep-alive',
                        'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                debug('auth params: %s',authParams);
                debug('dimensions: %s',dimRequested);
                request(options, function(e,r,b) {
                    if (r.statusCode >= 200 && r.statusCode < 400) {
                        xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                                if(err === null) {
                                    try {
                                        var data = obj.StructureSpecificData.DataSet[0];
                                        var vTS = data.Series; // vector of Time Series : vTS
                                        if (!req.timedout) {
                                            res.send(buildHTML.List(provider,vTS,dataSet,dim));
                                        }
                                    } catch(error) {
                                        debug(error);
                                        try {
                                            var footer = obj.StructureSpecificData.Footer[0].Message[0].code[0]; // for handling Eurostat errors
                                            if (footer === '413') {
                                                res.redirect('/413.html');
                                                debug('redirecting to 413');
                                            } else {
                                                var errorMessage = "Error parsing SDMX at: " + options.url;
                                                res.status(500).send(errorMessage);
                                                debug(errorMessage);
                                            }
                                        } catch(error2) {
                                            debug(error2);
                                            var errorMessage = "Error parsing SDMX at: " + options.url;
                                            res.status(500).send(errorMessage);
                                        }
                                    }
                                } else {
                                    res.send(err);
                                }
                            });
                    } else if (r.statusCode === 413) {
                        res.redirect('/413.html');
                    } else {
                        var errorMessage = "Error retrieving data at: " + options.url + '\n';
                        errorMessage += 'Code: ' + r.statusCode + '\n';
                        errorMessage += 'Message: ' + r.statusMessage;
                        res.status(r.statusCode).send(errorMessage);
                        debug(r);
                    }
                });
            }});
    } else {
        res.status(404).send("ERROR 404 - PROVIDER IS NOT SUPPORTED");
    }
};


exports.getBigDataSet = function(req,res) {    
    var provider = req.params.provider.toUpperCase();
    var protocol = providers[provider.toUpperCase()].protocol,
        host = providers[provider.toUpperCase()].host,
        path = providers[provider.toUpperCase()].path,
        format = providers[provider.toUpperCase()].format,
        agencyID = providers[provider.toUpperCase()].agencyID;
    if (isInArray(provider,Object.keys(providers))) {
        var dataSet = '';
        if (provider !== 'EUROSTAT' && provider !== 'WEUROSTAT')  {
            dataSet = req.params.dataset.toUpperCase();
        } else {
            dataSet = req.params.dataset;        
        };
        
        // All keys to UpperCase
        var key, keys = Object.keys(req.query);
        var n = keys.length;
        var reqParams={};
        while (n--) {
            key = keys[n];
            var kkey = key; // name of the key before it get changed below
            if (key.toUpperCase() === "FREQUENCY") {key = "FREQ";}
            if (key === 'startPeriod') {reqParams[key] = req.query[key];}
            else if (key === 'firstNObservations') {reqParams[key] = req.query[key];}
            else if (key === 'lastNObservations') {reqParams[key] = req.query[key];}
            else if (key === 'endPeriod') {reqParams[key] = req.query[key];}
            else {reqParams[key.toUpperCase()] = req.query[kkey];}
        }      
        var dimRequested = ''; // string fill with ordered dimensions passed by the user in req.params
        if (provider === 'WEUROSTAT') {
            var myPath = providers[provider].path + providers[provider].agencyID + '/data/' + dataSet;
        } else {
            var myPath = providers[provider].path + 'data/' + dataSet;
        }
        debug('getDataset with provider: %s, dataset: %s',provider,dataSet);
        debug('getDataset with path=%s',myPath);
        getDim(provider, null, null, dataSet, function(err,dim) {
            if (err) {
                res.status(500).send(dim); // if err, dim is the errorMessage
            } else {
                var authParams = dim.arrDim; // Authorised dimensions for the dataset.
                var compt = 0;
                authParams.forEach(function(it,ind){
                    if(reqParams[it] != null) {
                        if(ind<dim.nbDim-1) {dimRequested += reqParams[it]+'.';}
                        else { dimRequested += reqParams[it];}
                        delete reqParams[it];}
                    else {
                        if (ind<dim.nbDim-1) {
                            dimRequested += '.';
                        }
                        compt ++;
                    }
                });
                // When the whole dataSet is requested.
                if (compt == dim.nbDim) {
                    dimRequested = 'all';
                };
                myPath += '/' + dimRequested;

                Object.keys(reqParams).forEach(function(it,ind,arr) {
                    if (ind === 0) {
                        myPath += '?';
                    }
                    myPath += it.toString() + "=" + reqParams[it] ;
                    if (ind < arr.length-1) {
                        myPath += "&";
                    }
                });
                var options = {
                    url: protocol + '://' + host + myPath,
                    headers: {
                        'connection': 'keep-alive',
                        'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                debug('auth params: %s',authParams);
                debug('dimensions: %s',dimRequested);

                amqp.connect(urlrabbit,function(err,conn){
                    if (err) {
                        res.status(500).send('Interal Error while processing your request');
                        debug(err);
                    } else {
                        conn.createChannel(function(err,ch) {
                            if (err) {
                                res.status(500).send('Interal Error while processing your request');
                                debug(err);
                            } else {
                                ch.assertQueue(q,{durable:false});
                                var id = shortid.generate();
                                var file = dirTempFiles + id + '.html';
                                var task = {
                                    options: options,
                                    dataSet: dataSet,
                                    authParams: authParams,
                                    file: file
                                };
                                ch.sendToQueue(q, new Buffer(JSON.stringify(task)));
                                res.send(buildHTML.bigDataset(id));
                            }
                        });
                    }
                });
            }
        });
    } else {
        res.status(404).send("ERROR 404 - PROVIDER IS NOT SUPPORTED");
    }
};
            
exports.getTemp = function(req,res){
    var id = req.params.id,
        route = './../temp/' + id + '.html',
        file = './public/temp/' + id + '.html';
    if (id.slice(-4)) {
        res.send(buildHTML.wait(id));
    } else {
        setTimeout(function() {
            fs.unlink(file,function(err){
                if (err) {
                    console.log(err);
                } else {
                    debug('File %s deleted',file);
                }
            });
        }, 1000);
        res.redirect(route);
    }
};
