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
    // http = require('http'),
    http = require('follow-redirects').http,
    https = require('https'),
    url = require('url'),
    buildHTML = require('./buildHTML');

const providers = require('./providers.json');


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
    var myPath = providers[provider.toUpperCase()].path + 'dataflow/' + providers[provider.toUpperCase()].agencyID +'/'+dataset + '?format=compact_2_1';
    var options = {
        hostname: providers[provider.toUpperCase()].host,
        port: 80,
        path: myPath,
        headers: {
            'connection' : 'keep-alive',
            'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
            'user-agent': 'nodeJS'
        }
    };
    http.get(options, function(result) {
        if (result.statusCode >=200 && result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });
            result.on('end',function() {
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if (err === null) {
                        try {
                            var agency = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'][0]['Structure']['0']['Ref'][0]['agencyID'],
                                dsdId = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'][0]['Structure']['0']['Ref'][0]['id'];
                            callback(false,{"agency":agency,"dsdId":dsdId});
                        } catch(e) {
                            var errorMessage = "Error parsing SDMX when retrieving datastructure at: "+ options.hostname + options.path;
                            callback(true,errorMessage);
                        }
                    } else {
                        var errorMessage = "Error retrieving datastructure at: "+ options.hostname + options.path;
                        callback(true,errorMessage);
                    };
                });
            });
        }
    });
};

// Get dimension of the data using its datastructure
function getDim(provider, agency, dsdId, dataset, callback) {
    var nbDim = 0,
        arrDim = [];
    if ((agency === null && dsdId === null) && dataset !== null) {
        getAgency(provider,dataset,function(err,agencyInfo) {
            if (err) {
                callback(true,agencyInfo);
            } else {
                var myPath = providers[provider.toUpperCase()].path + 'datastructure/'+agencyInfo.agency+'/'+agencyInfo.dsdId + '?format=compact_2_1';
                var options = {
                    hostname: providers[provider.toUpperCase()].host,
                    port: 80,
                    path: myPath,
                    headers: {
                        'connection' : 'keep-alive',
                        'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                http.get(options, function(result) {
                    if (result.statusCode >=200 && result.statusCode < 400) {
                        var xml = '';
                        result.on('data', function(chunk) {
                            xml += chunk;
                        });
                        result.on('end',function() {
                            xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                                if(err === null) {
                                    try {
                                    var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                                    nbDim = data.length;
                                    data.forEach(function(item,index) {
                                        arrDim.push(item['id'][0]);
                                    });
                                        callback(false,{"nbDim": nbDim,"arrDim":arrDim,"data":data,"dsdId":dsdId});
                                    } catch(e) {
                                        var errorMessage = "Failed to retrieve dimensions - could not parse SDMX answer at: "+options.hostname+options.path;
                                        callback(true,errorMessage);
                                    }
                                } else {
                                    var errorMessage = "Failed to retrieve dimensions - error when retrieving data at: "+options.hostname+options.path;
                                    callback(true, errorMessage);
                                }
                            });
                        });
                    } 
                });
            }});
    } else if (agency === null && dataset === null) {
        callback(true,"no agency nor dataset provided");
    } else if (agency !== null && dsdId !== null) {
        var myPath = providers[provider.toUpperCase()].path + 'datastructure/'+agency+'/'+dsdId + '?format=compact_2_1';
        var options = {
            hostname: providers[provider.toUpperCase()].host,
            port: 80,
            path: myPath,
            headers: {
                'connection' : 'keep-alive',
                'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        http.get(options, function(result) {
            if (result.statusCode >=200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {
                    xml += chunk;
                });
                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err === null) {
                            try {
                                var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                                nbDim = data.length;
                                data.forEach(function(item,index) {
                                    arrDim.push(item['id'][0]);
                                });
                                callback(false,{"nbDim": nbDim,"arrDim":arrDim,"data":data});
                            } catch(e) {
                                var errorMessage = "Failed to retrieve dimensions - could not parse SDMX answer "+options.hostname+options.path;
                                callback(true, errorMessage);
                            }
                        } else {
                            var errorMessage = "Failed to retrieve dimensions - error when retrieving data at: "+options.hostname+options.path;
                            callback(true, errorMessage);
                        }
                    });
                });
            } 
        });           
    }
};

// ====================================== ROUTES ======================================

// List the datasets of a provider
exports.getAllDataFlow = function(req,res) {
    var provider = req.params.provider;
    if (isInArray(provider.toUpperCase(),Object.keys(providers))) {
        // var myPath = providers[provider.toUpperCase()].path+'dataflow/'+providers[provider.toUpperCase()].agencyID+'/all?format=compact_2_1';
        var myPath = providers[provider.toUpperCase()].path+'dataflow/'+providers[provider.toUpperCase()].agencyID+'?format=compact_2_1';
        var options = {
            hostname: providers[provider.toUpperCase()].host,
            path: myPath,
            headers: {
                'connection':'keep-alive',
                'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        http.get(options, function(result) {
            if (result.statusCode >=200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {
                    xml += chunk;
                });
                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if (err === null) {
                            var data = [];
                            try {
                                obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'].forEach(function(it,ind){
                                    var datasetId = it.id,
                                        dsdId = it.Structure[0]['Ref'][0]['id'],
                                        agency = it.Structure[0]['Ref'][0]['agencyID'],
                                        name = it.Name;//[0]['_']
                                    if (name.length > 1) {
                                        name.forEach(function(item,index){
                                            if (item['xml:lang'][0] === 'fr') {name = it.Name[index]['_'];}
                                        });
                                    } else {name = it.Name[0]['_'];}
                                    data.push([datasetId,dsdId,agency,name,provider]);
                                });
                                res.send(buildHTML.dataFlow(data,provider));
                            }
                            catch(e) {
                                console.log(e);
                                res.status(500).send('COULD NOT PARSE SDMX ANSWER');
                            }
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });
    } else {
        res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED.');
    }
};



// List the timeseries inside a dataset

exports.getDataFlow = function(req,res) {
    var provider = req.params.provider,
        dataSet = req.params.dataset,
        myTimeout = req.query.timeout;
    if (myTimeout === undefined) {
        myTimeout = 5000;
    } else {
        myTimeout = +myTimeout;
    }
    if (isInArray(provider.toUpperCase(),Object.keys(providers))) {
        getDim(provider,null,null,dataSet,function(err,dim) {
            if (err) {
                res.status(500).send(dim); // if err, dim is the error message
            } else {
                var myPath = providers[provider.toUpperCase()].path+'data/'+dataSet+'?detail=nodata';
                if (provider.toUpperCase() != 'EUROSTAT') {
                    myPath += '&format=compact_2_1';
                }
                var options = {
                    hostname : providers[provider.toUpperCase()].host,
                    port: 80,
                    path: myPath,
                    headers: {
                        'connection': 'keep-alive',
                        'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                var request = http.get(options, function(result) {
                    if (result.statusCode >= 200 && result.statusCode < 400) {
                        var xml = '';
                        result.on('data', function(chunk) { xml += chunk;});
                        result.on('end',function() {
                            xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj) {
                                if (err === null) {
                                    try {
                                        var footer =  obj.StructureSpecificData.Footer;
                                        try { footer = footer[0].Message[0].code[0];}
                                        catch(e) {}
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
                                    } catch(e) {
                                        console.log(e);
                                        var errorMessage = "Error retrieving data at: " + options.hostname + options.path;
                                        res.status(500).send(errorMessage);
                                    }
                                }
                                else {
                                    res.send(err);
                                }
                            });
                        });
                    } else {
                        if (!res.headersSent) {
                            var error = result.statusMessage;
                            res.send(buildHTML.detailDataset(provider,null,dataSet,dim,error));
                        }
                    }
                });
                request.setTimeout(myTimeout,function() {
                    var errorDatasetTooBig = 'the dataset is too big to retrieve all the timeseries. You can increase timeout by adding "?timeout=" at the end of the url (default is 5000ms)';
                    if (!res.headersSent) {
                        res.send(buildHTML.detailDataset(provider,null,dataSet,dim,errorDatasetTooBig));
                    }
                });
            }});
    } else {res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED');}
};

// Download a Dataset
exports.getDataSet = function(req,res) {
    // console.time('getDataset');
    var provider = req.params.provider.toUpperCase();
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
        var userParams = '';
        if (provider === 'WEUROSTAT') {
            var myPath = providers[provider].path + providers[provider].agencyID + '/data/' + dataSet;
        } else {
            var myPath = providers[provider].path + 'data/' + dataSet;
        }
        getDim(provider, null, null, dataSet, function(err,dim) {
            if (err) {
                res.status(500).send(dim); // if err, dim is the errorMessage
            } else {
                var authParams = dim.arrDim; // Authorised Parameters.
                var compt = 0;
                authParams.forEach(function(it,ind){
                    if(reqParams[it] != null) {
                        if(ind<dim.nbDim-1) {userParams += reqParams[it]+'.';}
                        else { userParams += reqParams[it];}
                        delete reqParams[it];}
                    else {
                        if (ind<dim.nbDim-1) {
                            userParams += '.';
                        }
                        compt ++;
                    }
                });
                // When the whole dataSet is requested.
                if (compt == dim.nbDim) {
                    userParams = '';
                };
                // console.log("authParams: ",authParams);
                // console.log("userParams: ",userParams);

                myPath += '/' + userParams + '?';
                Object.keys(reqParams).forEach(function(it,ind,arr) {
                    myPath += it.toString() + "=" + reqParams[it] ;
                    if (ind < arr.length-1) {
                        myPath += "&";
                    }
                });
                var options = {
                    hostname: providers[provider.toUpperCase()].host,
                    port: 80,
                    path: myPath,
                    headers: {
                        'connection': 'keep-alive',
                        'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                        'user-agent': 'nodeJS'
                    }
                };
                http.get(options, function(result) {
                    if (result.statusCode >= 200 && result.statusCode < 400) {
                        var xml = '';
                        result.on('data', function(chunk) {xml += chunk;});
                        result.on('end',function() {
                            xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                                if(err === null) {
                                    try {
                                        var data = obj.StructureSpecificData.DataSet[0];
                                        // console.timeEnd('getDataset');
                                        var vTS = data.Series; // vector of Time Series : vTS
                                        if (!req.timedout) {
                                            res.send(buildHTML.makeTable(vTS,dataSet,authParams));
                                        }
                                    } catch(e) {
                                        try {
                                            var footer = obj.StructureSpecificData.Footer[0].Message[0].code[0]; // for handling Eurostat errors
                                            if (footer === '413') {
                                                res.redirect('/413.html');
                                            } else {
                                                var errorMessage = "Error parsing SDMX at: " + options.hostname + options.path;
                                                res.status(500).send(errorMessage);
                                            }
                                        } catch(e) {
                                            var errorMessage = "Error parsing SDMX at: " + options.hostname + options.path;
                                            res.status(500).send(errorMessage);
                                        }
                                    }
                                } else {
                                    res.send(err);
                                }
                            });
                        });
                    } else if (result.statusCode === 413) {
                        res.redirect('/413.html');
                    } else {
                        var errorMessage = "Error retrieving data at: " + options.hostname + options.path + '\n';
                        errorMessage += 'Code: ' + result.statusCode + '\n';
                        errorMessage += 'Message: ' + result.statusMessage;
                        res.status(result.statusCode).send(errorMessage);
                        console.log(result);
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
    if (isInArray(provider,Object.keys(providers))) {
        var keys = Object.keys(req.query);
        var params = "?";
        keys.forEach(function(it,ind,arr) {
            params += it.toString() + "=" + req.query[it] ;
            if (ind<arr.length-1) {
                params += "&";
            }
        });
        if (provider !== 'EUROSTAT'){
            if (keys.length > 0) {params += '&format=compact_2_1';}
            else { params += 'format=compact_2_1';}
        }
        if (provider == "INSEE") {
            var myPath = '/series/sdmx/data/SERIES_BDM/'+series+params;
            var options = {
                hostname: 'www.bdm.insee.fr',
                port: 80,
                path: myPath,
                headers: {
                    'connection': 'keep-alive',
                    'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
                }
            };
            http.get(options, function(result) {
                if (result.statusCode >= 200 && result.statusCode < 400) {
                    var xml = '';
                    result.on('data', function(chunk) {xml += chunk;});
                    result.on('end',function() {
                        xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err === null) {
                                try {
                                    var data = obj.StructureSpecificData.DataSet[0];
                                    var vTS = data.Series;
                                    if (!req.timedout) {
                                        res.send(buildHTML.makeTable(vTS,series,[]));
                                    }}
                                catch(e) {
                                    console.log(e);
                                    var errorMessage = "Error parsing SDMX at: " + options.hostname + options.path;
                                    res.status(500).send(errorMessage);
                                }
                            } else{
                                res.send(err);
                            }
                        });
                    });
                } else {
                    res.status(result.statusCode).send(result.statusMessage);
                }
            });        
        } else {
            var arr = series.split('.'),
                dataSet = arr[0];
            arr.shift();
            var userParams = arr.join('.');
            var myPath = providers[provider].path+'data/'+dataSet+'/'+userParams + params;
            var options = {
                hostname: providers[provider].host,
                port: 80,
                path: myPath,
                headers: {
                    'connection': 'keep-alive',
                    'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                    'user-agent': 'nodeJS'
                }
            };
            http.get(options, function(result) {
                if (result.statusCode >= 200 && result.statusCode < 400) {
                    var xml = '';
                    result.on('data', function(chunk) {xml += chunk;});
                    result.on('end',function() {
                        xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err === null) {
                                try {
                                    var data = obj.StructureSpecificData.DataSet[0];
                                    var vTS = data.Series;
                                    if (!req.timedout) {
                                        res.send(buildHTML.makeTable(vTS,series,[]));
                                    }
                                }
                                catch(e) {
                                    console.log(e);
                                    var errorMessage = "Error parsing SDMX at: " + options.hostname + options.path;
                                    res.status(500).send(errorMessage);
                                }
                            } else {
                                res.send(err);
                            }
                        });
                    });
                } else {
                    res.status(result.statusCode).send(result.statusMessage);
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

    if (isInArray(provider,Object.keys(providers))) {
        if (provider === 'EUROSTAT') {
            var myPath = providers[provider.toUpperCase()].path + 'datastructure/'+providers[provider].agencyID+'/' + dsdId + '?format=compact_2_1';
        } else {
            var myPath = providers[provider].path+'codelist/' + providers[provider].agencyID + '/' + dim + '?format=compact_2_1';
        }
        var options = {
            hostname: providers[provider].host,
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive',
                'accept': 'application/vnd.sdmx.structure+xml; version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        http.get(options, function(result) {
            if (result.statusCode >=200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {xml += chunk;});
                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
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
                                res.send(buildHTML.codeList(codes,title_dim));}
                            catch(e) {
                                var errorMessage = "Error parsing SDMX at: " + options.hostname + options.path;
                                res.status(500).send(errorMessage);
                            }
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.status(result.statusCode).send(result.statusMessage);
            }
        });                   
    } else {
        res.status(404).send('ERROR 404 - PROVIDER IS NOT SUPPORTED');
    }
};

// Retrieve data from SDMX URL
exports.getDatafromURL = function(req,res) {

    var myUrl = req.query.url.replace(/\'*/g,"").replace(/\s/g,'+'); // remove ''
    var hostname = url.parse(myUrl).hostname,
        protocol = url.parse(myUrl).protocol,
        path = url.parse(myUrl).pathname;
    
    var options = {
        protocol: protocol,
        hostname: hostname,
        port: 80,
        path: path,
        headers: {
            'connection': 'keep-alive',
            'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
            'user-agent': 'nodeJS'
        }       
    };
    if (protocol === 'http:') {
        http.get(options, function(result) {
            if (result.statusCode >= 200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err === null) {
                            if (!req.timedout) {
                                if (typeof obj.StructureSpecificData !== 'undefined') {
                                    var data = obj.StructureSpecificData.DataSet[0],
                                        vTS = data.Series,
                                        title = 'request to '+ hostname;
                                    res.send(buildHTML.makeTable(vTS,title,[]));                      
                                } else {
                                    res.set('Content-type','text/plain');
                                    res.send('The request could not be handled');
                                }
                            }
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });
    } else if (protocol === 'https:') {
        https.get(options, function(result) {
            if (result.statusCode >= 200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err === null) {
                            if (!req.timedout) {
                                if (typeof obj.StructureSpecificData !== 'undefined') {
                                    var data = obj.StructureSpecificData.DataSet[0],
                                        vTS = data.Series,
                                        title = 'request to '+ hostname;
                                    res.send(buildHTML.makeTable(vTS,title,[]));                      
                                } else {
                                    res.set('Content-type','text/plain');
                                    res.send('The request could not be handled');
                                }
                            }
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });
    } else {
        res.set('Content-Type', 'text/plain');
        res.send('protocol '+protocol+' is not recognised');
    }
};


exports.redirectURL = function(req,res) {
    var myUrl = req.body.myUrl;
    var route = "/req?url='" + myUrl + "'";
    res.redirect(route);
};

exports.getProviders = function(req,res) {
    res.send(buildHTML.listProviders(providers));
};
