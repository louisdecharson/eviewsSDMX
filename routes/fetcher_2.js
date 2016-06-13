var xml2js = require('xml2js'),
    assert = require('assert'),
    concat = require('concat-stream'),
    libxmljs = require("libxmljs"),
    http = require('http');

require('total.js');


var urlINSEE = "http://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/";
var parser = new xml2js.Parser();

// var data = '';


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
                var obj = xml.parseXML();
                obj = obj['message:StructureSpecificData'];
                obj = obj['message:DataSet'];
                res.send(obj);
            });
        }
        else {
            res.send(result.statusCode);
        }
    });
};

// exports.getSeries = function(req,res) {
//     var arr = req.params.series.split('+');
//     var series = req.params.series;
//     var startPeriod = req.param('startPeriod');

//     var url = urlINSEE+series+"?startPeriod="+startPeriod;

//     http.get(url, function(result) {
//         if (result.statusCode >= 200 || result.statusCode < 400) {
//             result.on('data', function(data_) { data += data_.toString(); });
//             result.on('end', function() {
//                 parser.parseString(data, function(err, ans) {
//                     res.send(data);
//                 });
//             });
//         }
//     });
// };
