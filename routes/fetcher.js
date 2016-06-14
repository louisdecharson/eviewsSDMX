var xml2js = require('xml2js'),
    assert = require('assert'),
    concat = require('concat-stream'),
    http = require('http');

var urlINSEE = "http://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/";
var parser = new xml2js.Parser();



function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

function buildHtml(vTS,title){
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th>';
    var theader2 = '<th>&nbsp;</th>';
    var tbody = '';

    var vTsSorted = vTS.sort(function(a,b) { return b.Obs.length-a.Obs.length;});
    var nbObs = vTsSorted[0].Obs.length;
    var vInd = new Array(vTS.length).fill(0);

    var vTsSR = [];
    
    // HEADER 
    for(var kk=0; kk<vTsSorted.length; kk++) {
        theader1 += '<th>' + vTsSorted[kk].IDBANK[0] + '</th>';
        theader2 += '<th>' + vTsSorted[kk].TITLE[0] + '</th>';
        vTsSR.push(vTsSorted[kk].Obs.reverse());
    }
    
    // BODY
    var i = 0;

    while (i < nbObs) {
        tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0] + '</td>';
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



function getFreq(freq){
    return freq.toUpperCase() + "...." ;
}


exports.getSeries = function(req,res) {
    
    var arr = req.params.series.split('+');
    var series = req.params.series;
    var startPeriod = req.param('startPeriod');
    var lastNObservations = req.param('lastNObservations');
    var myPath = '';

    if(startPeriod == null && lastNObservations == null){
        myPath = "/series/sdmx/data/SERIES_BDM/"+series;
    } else if (startPeriod!= null){
        myPath = "/series/sdmx/data/SERIES_BDM/"+series+"?startPeriod="+startPeriod;
    } else {
        myPath = "/series/sdmx/data/SERIES_BDM/"+series+"?lastNObservations="+lastNObservations;
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

    

    var dataSet = req.params.dataset;
    var freq = req.param('freq');
    var startPeriod = req.param('startPeriod');
    var lastNObservations =  req.param('lastNObservations');
    
    var myPath = "/series/sdmx/data/"+dataSet;

    
    if(freq == null){
        res.send('Error -> you must filter by frequency.');
    } else {
        freq = getFreq(freq);
        myPath += '/' + freq ;
        if (startPeriod != null){
        myPath += "?startPeriod="+startPeriod;
        } else if (lastNObservations != null) {
            myPath += "?lastNObservations="+lastNObservations;
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
    }
};

