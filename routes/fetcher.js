var xml2js = require('xml2js'),
    assert = require('assert'),
    concat = require('concat-stream'),
    libxmljs = require("libxmljs"),
    http = require('http');


var urlINSEE = "http://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/";
var parser = new xml2js.Parser();

// var data = '';


function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

function buildHtml(vTS){
    var header = '';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th>';
    var theader2 = '<th>&nbsp;</th>';
    var tbody = '';

    vTS.forEach( function(item, index) {
        theader1 = theader1 + '<th>' + item.IDBANK[0] + '</th>';
        theader2 = theader2 + '<th>' + item.TITLE[0] + '</th>';
        item.Obs.reverse().forEach( function(it,ind) {
            tbody = tbody + '<tr><td>' + it.TIME_PERIOD[0] + '</td>';
            tbody = tbody + '<td>' + it.OBS_VALUE[0] + '</td></tr>';
        });
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table>' + '<thead>'  + '<tr>' + theader1 + '</tr>' + '<tr>' + theader2 + '</tr>'  + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';

    return myHtml;
}
    


exports.getSeries = function(req,res) {
    var arr = req.params.series.split('+');
    var series = req.params.series;
    var startPeriod = req.param('startPeriod');

    var myPath = "/series/sdmx/data/SERIES_BDM/"+series+"?startPeriod="+startPeriod;

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
        if (result.statusCode >= 200 || result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });
            result.on('end',function() {
                // parser.parseString(xml, function(err,resu){
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    var data = obj.StructureSpecificData.DataSet[0];
                    var vTS = data.Series;
                    var myArray = new Array(1,2,3);
                    // var idBank = ts.IDBANK[0];

                    // var myJSON = JSON.stringify(data,null,4);                    
                    // console.log(myJSON);
                    // console.log(data);

                    res.send(buildHtml(vTS));
                });
            });
        }
        else {
            res.send(result.statusCode);
        }
    });
};

