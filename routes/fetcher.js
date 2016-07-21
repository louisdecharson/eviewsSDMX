var xml2js = require('xml2js'),
    assert = require('assert'),
    concat = require('concat-stream'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    ical = require('ical-generator'),
    moment = require('moment-timezone'),
    forms = require('forms'),
    http = require('http');



var parser = new xml2js.Parser();



function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

function getDim(dataSet, callback) {
    var nbDim = 0;
    var arrDim = [];
    
    var myPath = "/series/sdmx/datastructure/FR1/" + dataSet;
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
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
                        callback([nbDim,arrDim]); 
                    }
                });
            });
        } 
    });
};


function buildDataStruc(data,title) {
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body ='';

    var Dim = '<p>Nb of dimensions : '+data.length+'</p>';
    var listDim = 'Dimensions list : <ul> ';

    data.forEach(function(item,index) {
        var code = item['LocalRepresentation'][0]['Enumeration'][0]['Ref'][0]['id'][0];
        listDim += '<li>'+ item['position'][0] + ". " + '<a href=/codelist/'+ code + '>' +item['id'][0]+'</a></li>';

    });
    listDim += '</ul>';
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + Dim + listDim + '</body></html>';
    return myHtml;
    
};



function buildCodeList(codes,title_dim) {
    var header = '<title>SDMX API for EViews / Codelist for '+ title_dim +'</title>';
    var body ='',
        table = '',
        theader = '<th>Id</th><th>Description</th>',
        tbody = '<h2>List of codes potentially available for the dimension ' + title_dim  + '</h2>';


    codes.forEach(function(item,index) {
        tbody += '<tr><td style="min-width:50px">' + item['id'][0]  + '</td>';
        tbody += '<td style="min-width:100px">' + item['Name'][item['Name'].length-1]['_']+'</td></tr>';
        
    });
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table cellpadding="4" rules="cols">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
};




function buildDataflows(data) {
    var header = '<title>SDMX API for EViews / DATAFLOWS </title>';
    var body = '',
        table = '',
        theader = '<th>Id</th><th>Description (FR)</th><th>Description (EN)</th>',
        tbody = '';
    
    data.forEach(function(item,index){
        tbody += '<tr><td><a href="/dataflow/' + item.id + '">' + item.id + '</a>' + '</td><td>';
        tbody += item.Name[0]['_'] + '</td><td>';
        if (item.Name.length > 1) {
            tbody += item.Name[1]['_'] + '</td><td>';
        } else {
            tbody += '&nbsp;</td><td>';
        }
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table><col width="200"' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
};                 


function buildHtml(vTS,title){
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th>';
    var theader2 = '<th>&nbsp;</th>';
    var tbody = '';

    var vTsSorted = vTS.sort(function(a,b) { return b.Obs.length-a.Obs.length;}); // vector of timeseries
    var nbObs = vTsSorted[0].Obs.length;
    var vInd = new Array(vTS.length).fill(0); // vector of cursors

    var vTsSR = [];
    
    // HEADER 
    for(var kk=0; kk<vTsSorted.length; kk++) {
        theader1 += '<th>' + vTsSorted[kk].IDBANK[0] + '</th>';
        theader2 += '<th>' + vTsSorted[kk].TITLE[0] + '</th>';
        vTsSR.push(vTsSorted[kk].Obs.reverse()); // sorted vector of timeseries
    }
    
    // BODY
    var i = 0;

    while (i < nbObs) {
        // tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0] + '</td>';
        tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0].replace('-Q','Q') + '</td>';
        tbody += '<td style="text-align:center">' + vTsSR[0][i].OBS_VALUE[0] + '</td>';
        for(var k=1; k<vTsSR.length; k++) {
            if(vInd[k] < vTsSR[k].length) {
                if(vTsSR[0][i].TIME_PERIOD[0] == vTsSR[k][vInd[k]].TIME_PERIOD[0]) {
                    tbody += '<td style="text-align:center">' + vTsSR[k][vInd[k]].OBS_VALUE[0] + '</td>';
                    vInd[k] =  vInd[k] + 1;
                } else {
                    tbody += '<td style="text-align:center"></td>';
                }
            } else {
                tbody += '<td style="text-align:center"></td>';
            }
        }
        tbody += '</tr>';
        i ++;
    };
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table>' + '<thead>'  + '<tr>' + theader1 + '</tr>' + '<tr>' + theader2 + '</tr>'  + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    
    return myHtml;
}



function buildHtmlnoData(vTS,title){
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body = '';
    var table ='';
    var theader = '<th>IdBank</th><th>Title</th><th>Last update</th>';
    var tbody = '';

    vTS.forEach(function(item,index){
        tbody += '<tr><td><a href="/series/' + item.IDBANK[0] + '">' + item.IDBANK[0] +'</a></td><td>';
        tbody += item.TITLE[0] + '</td><td>';
        tbody += item.LAST_UPDATE[0] + '</td><td>';
    });
                 
    
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table cellpadding="4" rules="cols">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    
    return myHtml;
}


function getFreq(freq){
    return freq.toUpperCase() + "...." ;
}


exports.getSeries = function(req,res) {
    
    var arr = req.params.series.split('+');
    var series = req.params.series;
    
    var startPeriod = req.param('startPeriod'),
        lastNObservations = req.param('lastNObservations'),
        endPeriod = req.param('endPeriod'),
        firstNObservations = req.param('firstNObservations');

    var keys = Object.keys(req.query);
    var params = "?";
    keys.forEach(function(it,ind,arr) {
        params += it.toString() + "=" + req.query[it] ;
        if (ind<arr.length-1) {
            params += "&";
        }
    });    
    var myPath = '/series/sdmx/data/SERIES_BDM/'+series+params;

    // if (startPeriod!= null) {
    //     myPath += "?startPeriod="+startPeriod;
    // } else if (lastNObservations != null) {
    //     myPath += "?lastNObservations="+lastNObservations;
    // } else if (firstNObservations != null) {
    //     myPath += "?firstNObservations="+firstNObservations;
    // } else if (endPeriod != null) {
    //     myPath += "?endPeriod="+endPeriod;        
    // }

    
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
            result.on('data', function(chunk) {
                xml += chunk;
            });
            result.on('end',function() {
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err == null) {
                        var data = obj.StructureSpecificData.DataSet[0];
                        var vTS = data.Series;
                        res.send(buildHtml(vTS,arr[0]));
                    }
                    else{
                        res.send(err);
                    }
                });
            });
        }
        else {
            res.send(result.statusCode);
        }
    });
};

exports.getDataSet = function(req,res) {

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
    var dataSet = req.params.dataset.toUpperCase();
    var startPeriod = reqParams['STARTPERIOD'],
        firstNObservations = reqParams['FIRSTNOBSERVATIONS'],
        lastNObservations =  reqParams['LASTNOBSERVATIONS'],
        endPeriod = reqParams['ENDPERIOD'];
    
    var myPath = "/series/sdmx/data/"+dataSet;
    var userParams = '';

    getDim(dataSet, function(arr) {
        var authParams = arr[1];
        authParams.forEach(function(it,ind){
            if(reqParams[it] != null) {
                if(ind<arr[0]-1) {
                    userParams += reqParams[it]+'.';
                } else {
                    userParams += reqParams[it];
                }
            }
            else {
                userParams += '.';
            }
        });
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
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err == null) {
                            var data = obj.StructureSpecificData.DataSet[0];
                            var vTS = data.Series;
                            res.send(buildHtml(vTS,dataSet));
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

    var myPath = '/series/sdmx/dataflow';
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
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
                        var data = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'];
                        res.send(buildDataflows(data));
                    } else {
                        res.send(err);
                    }
                });
            });
        } else {
            res.send(result.statusCode);
        }
    });    
};


exports.getDataStruc = function(req,res) {

    var dataSet = req.params.dataset;
    var myPath = "/series/sdmx/datastructure/FR1/" + dataSet;
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
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
                        var nbDimension = data.length;
                        res.send(buildDataStruc(data,dataSet));
                    } else {
                        res.send(err);
                    }
                });
            });
        } else {
            res.send(result.statusCode);
        }
    });
};

exports.getCodeList = function(req,res) {

    var dim = req.params.codelist;
    var myPath = "/series/sdmx/codelist/FR1/" + dim;
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
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
                        res.send(buildCodeList(codes,title_dim));
                    } else {
                        res.send(err);
                    }
                });
            });
        } else {
            res.send(result.statusCode);
        }
    });

};


exports.getListIdBanks = function(req,res) {

    var dataSet = req.params.dataset.toUpperCase();

    var myPath = "/series/sdmx/data/"+dataSet+"?detail=nodata";
    
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
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err == null) {
                            var data = obj.StructureSpecificData.DataSet[0];
                            var vTS = data.Series;
                            res.send(buildHtmlnoData(vTS,dataSet));
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });
    
};


