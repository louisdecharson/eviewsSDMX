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

// PACKAGES
var request = require('request'),
    debug = require('debug')('bls'),
    buildHTML = require('./buildHTML.js');

// TODO : implement multiple series request

exports.getSeries = function(req,res) {
    
    var payload = {
        seriesid: req.params.series.split('+'),
        startyear: req.query['startyear'],
        endyear: req.query['endyear'],
        registrationkey: req.params.apiKey
    };
    var payloadData = JSON.stringify(payload);  
    var options = {
        url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        body: payloadData,
        method: 'POST',
        headers : {
            'connection': 'keep-alive',
            'Content-Type': 'application/json',
            'user-agent': 'nodeJS'
        }
    };
    debug('getSeries BLS with path=%s and payload=%s',options.url,payloadData);
    request(options,function(err,result,body) {
        debug('Answer received: %s',body);
        if (!err & result.statusCode >=200 && result.statusCode < 400) {
            var data = JSON.parse(body);
            res.send(buildHTML.makeTableBLS(data.Results.series[0]));
        } else {
            res.send(result.statusCode);
        }
    });

};
