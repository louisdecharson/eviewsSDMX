
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

var assert = require('assert'),
    concat = require('concat-stream'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    ical = require('ical-generator'),
    moment = require('moment-timezone'),
    forms = require('forms'),
    http = require('http'),
    https = require('https');


function buildHMTL(arr,name) {

    var header = '<title>SDMX API for EViews / '+ name +'</title>';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th><th>'+name+'</th>';
    var tbody = '';

    arr.forEach(function(it,ind) {
        tbody += '<tr><td>'+it[0]+'</td><td style="align:center">'+it[1]+'</td></tr>';
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table>' + '<thead>'  + '<tr>' + theader1 + '</tr></thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
    
}


exports.getSeries = function(req,res) {

    var arrSeries = req.params.series.split('+');
    var series = req.params.series;
    var dataset = req.params.dataset;
    var apiKey = req.params.apiKey;

    if (dataset === "ICE") {

        arrSeries.forEach(function(it,ind) {
            var myPath = '/api/v3/datasets/'+ dataset + '/' + it + '.json?api_key='+apiKey;
            var options = {
                hostname: 'www.quandl.com',
                port: 443,
                path: myPath,
                headers: {
                    'connection': 'keep-alive'
                }
            };
            https.get(options, function(result) {
                if (result.statusCode >=200 && result.statusCode < 400) {
                    var xml = '';
                    result.on('data', function(chunk) {
                        xml += chunk;
                    });
                    result.on('end',function() {
                        var json = JSON.parse(xml);
                        var nameSeries = json.dataset.column_names[4];
                        var mySeries = [];
                        json.dataset.data.forEach(function(item,indice) {
                            mySeries.push([item[0],item[4]]);
                        });
                        res.send(buildHMTL(mySeries.reverse(),nameSeries));
                    });
                } else {
                    if (result.statusCode === 429) {
                        var msg = "Too many requests";
                    } else {
                        var msg = "";
                    }
                    var e = "Error: "+result.statusCode + ' | '+ msg  + ' | Headers '+JSON.stringify(result.headers) + ' | ';
                    res.send(e);
                };
            });
        });
     } else {
        res.send('Not yet supported');
     }
};
    
