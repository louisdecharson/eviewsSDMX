
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


function buildHMTL(arr,nameSeries) {

    var header = '<title>SDMX API for EViews / '+ nameSeries +'</title>';
    var body = '';
    var table ='';
    var myHeader = '<h4> FRED API</h4>',
        theader2 = '<th>Dates</th><th>' + nameSeries  + '</th>';
    var tbody = '';
    
    arr.forEach(function(it,ind) {
        tbody += '<tr>';
        tbody += '<td style="text-align:center">' + it.date  +'</td>';
        tbody += '<td style="text-align:center">' + it.value  +'</td>';
        tbody += '</tr>';
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + myHeader  +'<table>' + '<thead>'  + '<tr>' + theader2 +  '</tr></thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
    
}

exports.getSeries = function(req,res) {

    var series = req.params.series;
    var apiKey = req.params.apiKey;
 
    var myPath = '/fred/series/observations?series_id='+ series + '&api_key='+apiKey+"&file_type=json";
    var options = {
        hostname: 'api.stlouisfed.org',
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
                var mySeries = json.observations;
                res.send(buildHMTL(mySeries,series));
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
};
