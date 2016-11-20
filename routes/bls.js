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
    forms = require('forms');

// TODO : implement multiple series request

function buildHTML(series) {

    var data = series.data;
    var header = '<title>SDMX API for EViews / BLS / '+ series.seriesID +'</title>',
        body = '',
        table ='',
        myHeader = '<h4> Bureau of Labor Statistics - '+ series.seriesID +'</h4>',
        theader2 = '',
        tbody = '';

    theader2 += '<th>' + series.seriesID  + '</th>';
    data.forEach(function(it,ind) {
        tbody += '<tr>';
        tbody += '<td style="align:center">' + it.year + it.period +'</td>';
        tbody += '<td style="align:center">' + it.value +'</td>';
        tbody += '</tr>';
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + myHeader  +'<table>' + '<thead>'  + '<tr>' + theader2 +  '</tr></thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';

    return myHtml;

}

exports.getSeries = function(req,res) {

    var arrSeries = req.params.series.split('+'),
        apiKey = req.params.apiKey,
        startYear = req.param('startyear'),
        endYear = req.param('endyear');

    var payload = {
        seriesid: req.params.series.split('+'),
        startyear: req.param('startyear'),
        endyear: req.param('endyear'),
        registrationkey: req.params.apiKey
    };

    // var payloadData = querystring.stringify(payload);
    var payloadData = JSON.stringify(payload);
    
    var options = {
        url: 'http://api.bls.gov/publicAPI/v2/timeseries/data/',
        body: payloadData,
        method: 'POST',
        headers : {
            'connection': 'keep-alive',
            'Content-Type': 'application/json',
            'user-agent': 'nodeJS'
        }
    };
    
    request(options,function(err,result,body) {
        if (!err & result.statusCode >=200 && result.statusCode < 400) {
            var data = JSON.parse(body);
            res.send(buildHTML(data.Results.series[0]));
        } else {
            res.send(result.statusCode);
        }
    });

};
