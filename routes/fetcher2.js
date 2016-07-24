var xml2js = require('xml2js'),
    assert = require('assert'),
    concat = require('concat-stream'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    ical = require('ical-generator'),
    moment = require('moment-timezone'),
    forms = require('forms'),
    http = require('http'),
    buildHTML = require('./buildHTML');


// var parser = new xml2js.Parser();


// Utilitaires

function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}


function getErrorMessage(errorCode) {
    var message = '';
    if (errorCode == 500) {
        message = 'Internal Server Error';
        return message;
    } else {
        return message;
    }
}


// return the url "base" for a service Eurostat, BCE, INSEE
function getService(service, callback) {

    service = service.toUpperCase();
    var url = '',
        path = '',
        provider = '';
    if (service == "INSEE") {
        url = 'www.bdm.insee.fr',
        path = '/series/sdmx/',
        provider = 'FR1';
    } else if (service == "ECB") {
        url = 'sdw-wsrest.ecb.europa.eu',
        path = '/service/',
        provider = 'ECB';
    } else if (service == "EUROSTAT") {
        url = 'ec.europa.eu',
        path = '/eurostat/SDMX/diss-web/rest/',
        provider = 'ESTAT';
    }
    callback([url,path,provider]);
};


// On récupére le nom de l'agence que l'on utilise pour récupérer la DSD d'un dataset
function getAgency(service,dataset,callback) {
    getService(service, function(url) {
        var myPath = url[1]+'dataflow/'+url[2]+'/'+dataset;
        var options = {
            hostname: url[0],
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
                        if (err == null) {
                            var agency = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'][0]['Structure']['0']['Ref'][0]['agencyID'],
                                dsdId = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'][0]['Structure']['0']['Ref'][0]['id'];
                            callback([agency,dsdId]);
                        } else {
                            callback([err]);
                        };
                    });
                });
            }
        });
    });
};
            


function getDim(service, agency, dsdId, dataset, callback) {
    var nbDim = 0,
        arrDim = [];
    getService(service, function(url) {
        if ((agency == null && dsdId == null) && dataset != null) {
            getAgency(service,dataset,function(agencyInfo) {
                agency = agencyInfo[0],
                dsdId = agencyInfo[1];              
                var myPath = url[1]+'datastructure/'+agency+'/'+dsdId;
                var options = {
                    hostname: url[0],
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
                                if(err == null) {
                                    var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                                    nbDim = data.length;
                                    data.forEach(function(item,index) {
                                        arrDim.push(item['id'][0]);
                                    });
                                    callback([nbDim,arrDim,data]); 
                                }
                            });
                        });
                    } 
                });
            });
        } else if (agency == null && dataset == null) {
            console.log("not possible not retrieve data with no agency nor dataset");
        } else if (agency != null && dsdId != null) {

            var myPath = url[1]+'datastructure/'+agency+'/'+dsdId;
            var options = {
                hostname: url[0],
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
                            if(err == null) {
                                var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                                nbDim = data.length;
                                data.forEach(function(item,index) {
                                    arrDim.push(item['id'][0]);
                                });
                                callback([nbDim,arrDim,data]); 
                            }
                        });
                    });
                } 
            });           
        }
    });
};
              


exports.getAllDataFlow = function(req,res) {
    var service = req.params.service;
    getService(service, function(url) {
        var myPath = url[1]+'dataflow/'+url[2]+'/all';
        var options = {
            hostname: url[0],
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
                        if (err == null) {
                            var data = [];
                            obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'].forEach(function(it,ind){
                                var datasetId = it.id,
                                    dsdId = it.Structure[0]['Ref'][0]['id'],
                                    agency = it.Structure[0]['Ref'][0]['agencyID'],
                                    name = it.Name[0]['_'];
                                data.push([datasetId,dsdId,agency,name,service]);
                            });
                            res.send(buildHTML.dataFlow(data,service));
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });
    });      
};




exports.getDataFlow = function(req,res) {
    var service = req.params.service,
        dataSet = req.params.dataset,
        myTimeout = req.param('timeout');

    if (myTimeout == null) {
        myTimeout = 5000;
    } else {
        myTimeout = +myTimeout;
    }
    getService(service, function(url) {
        var myPath = url[1]+'data/'+dataSet+'?detail=nodata';
        var options = {
            hostname : url[0],
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive',
                'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1',
                'user-agent': 'nodeJS'
            }
        };
        var hitTimeOut = false;
        var request = http.get(options, function(result) {
            if (result.statusCode >= 200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj) {
                        if (err==null) {
                            var footer =  obj.StructureSpecificData.Footer;
                            try {
                                footer = footer[0].Message[0].code[0];
                            } catch(e) {
                            } finally {
                                if (footer == '413') {
                                    var errorFooter413 = '413 | Dataset is too big to retreive'; // Eurostat is sending error 413 in the footer...
                                    getDim(service,null,null,dataSet,function(arr) {
                                        res.send(buildHTML.detailDataset(service,null,dataSet,arr,errorFooter413));
                                    });
                                } else if (footer != null) {
                                    res.status(footer).send('ERROR | Code : '+ footer + ' ' + getErrorMessage(footer));
                                } else {                   
                                    var data = obj.StructureSpecificData.DataSet[0];
                                    var vTS = data.Series;
                                    getDim(service, null, null, dataSet, function(arr) {
                                        if (!hitTimeOut) {
                                            res.send(buildHTML.detailDataset(service,vTS,dataSet,arr,null));
                                        }
                                    });
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
        request.setTimeout(myTimeout,function() {
            hitTimeOut = true;
            var errorDatasetTooBig = 'the dataset is too big to retrieve all the timeseries. You can increase timeout by adding "?timeout=" at the end of the url (default is 5000ms)';
            getDim(service,null,null,dataSet,function(arr) {
                res.send(buildHTML.detailDataset(service,null,dataSet,arr,errorDatasetTooBig));
            });
        });
    });
};

exports.getDataSet = function(req,res) {

    var service = req.params.service.toUpperCase();
    var dataSet = '';
    if (service != 'EUROSTAT')  {
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
        if (key.toUpperCase() == "FREQUENCY") {
             key = "FREQ";
        }       
        reqParams[key.toUpperCase()] = req.query[kkey];
    }

    var startPeriod = reqParams['STARTPERIOD'],
        firstNObservations = reqParams['FIRSTNOBSERVATIONS'],
        lastNObservations =  reqParams['LASTNOBSERVATIONS'],
        endPeriod = reqParams['ENDPERIOD'];
    
    var userParams = '';

    getService(service, function(url) {
        var myPath = url[1]+'data/'+dataSet;
        getDim(service, null, null, dataSet, function(arr) {
            var authParams = arr[1]; // Authorised Parameters.
            var compt = 0;
            authParams.forEach(function(it,ind){
                if(reqParams[it] != null) {
                    if(ind<arr[0]-1) {
                        userParams += reqParams[it]+'.';
                    } else {
                        userParams += reqParams[it];
                    }
                }
                else {
                    if (ind<arr[0]-1) {
                        userParams += '.';
                    }
                    compt ++;
                }
            });
            // When the whole dataSet is requested.
            if (compt == arr[0]) {
                userParams = '';
            };
            myPath += '/' + userParams;
            if (startPeriod != null){
                myPath += "?startPeriod="+startPeriod;
            } else if (lastNObservations != null) {
                myPath += "?lastNObservations="+lastNObservations;
            } else if (endPeriod != null) {
                myPath += "?endPeriod="+endPeriod;
            } else if (firstNObservations != null) {
                myPath += "?firstNObservations="+firstNObservations;
            }
            var options = {
                hostname: url[0],
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
                    result.on('data', function(chunk) {
                        xml += chunk;
                    });

                    result.on('end',function() {
                        xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err == null) {
                                var data = obj.StructureSpecificData.DataSet[0];
                                var vTS = data.Series;
                                res.send(buildHTML.makeTable(vTS,dataSet,authParams));
                            } else {
                                res.send(err);
                            }
                        });
                    });
                } else {
                    res.send(result.statusCode);
                }
            });
        });
    });
};

exports.getSeries = function(req,res) {

    var series = req.params.series,
        service = req.params.service.toUpperCase();

    var keys = Object.keys(req.query);
    var params = "?";
    keys.forEach(function(it,ind,arr) {
        params += it.toString() + "=" + req.query[it] ;
        if (ind<arr.length-1) {
            params += "&";
        }
    });  
    if (service == "INSEE") {
        var route = '/series/'+series+params;
        res.redirect(route);
    } else {
        var arr = series.split('.'),
            dataSet = arr[0];
        arr.shift();
        var userParams = arr.join('.');

        getService(service, function(url) {
            var myPath = url[1]+'data/'+dataSet+'/'+userParams+params;
            var options = {
                hostname: url[0],
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
                    result.on('data', function(chunk) {
                        xml += chunk;
                    });

                    result.on('end',function() {
                        xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                            if(err == null) {
                                var data = obj.StructureSpecificData.DataSet[0];
                                var vTS = data.Series;
                                res.send(buildHTML.makeTable(vTS,series,[]));
                            } else {
                                res.send(err);
                            }
                        });
                    });
                } else {
                    res.send(result.statusCode);
                }
            });
        });
    };
};

exports.getCodeList = function(req,res) {

    var service = req.params.service,
        dim = req.params.codelist;
    
    getService(service,function(url) {
        var myPath = url[1]+'codelist/'+url[2]+ '/' + dim ;
        var options = {
            hostname: url[0],
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
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err == null) {
                            var data = obj['Structure']['Structures'][0]['Codelists'][0]['Codelist'][0];
                            var title_dim = data['id'][0];
                            var codes = data['Code'];
                            res.send(buildHTML.codeList(codes,title_dim));
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });                   
    });
};
