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
                'connection' : 'keep-alive'
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
                        'connection' : 'keep-alive'
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
                    'connection' : 'keep-alive'
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
        var myPath = url[1]+'dataflow';
        var options = {
            hostname: url[0],
            port: 80,
            path: myPath,
            headers: {
                'connection':'keep-alive'
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
                            res.send(buildHTML.dataFlow(data));
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
        dataSet = req.params.dataset;

    getService(service, function(url) {
        var myPath = url[1]+'data/'+dataSet+'?detail=nodata';
        var options = {
            hostname : url[0],
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
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj) {
                        if (err==null) {
                            var data = obj.StructureSpecificData.DataSet[0];
                            var vTS = data.Series;
                            getDim(service, null, null, dataSet, function(arr) {
                                res.send(buildHTML.detailDataset(service,vTS,dataSet,arr));
                            });
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

exports.getDataSet = function(req,res) {

    var dataSet = req.params.dataset.toUpperCase(),
        service = req.params.service.toUpperCase();
        

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
                    'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
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
                    'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
                }
            };
            console.log(myPath);
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
