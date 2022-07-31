
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
// =====================================================================

// PACKAGES
import * as https from 'https';
import Debug from 'debug';
import { makeTableFred } from './buildHTML.js';

const logger = Debug('fred');

export function getSeries(req,res) {
    var series = req.params.series,
        apiKey = req.params.apiKey;
    var myPath = '/fred/series/observations?series_id='+ series + '&api_key='+apiKey+"&file_type=json";
    var options = {
        hostname: 'api.stlouisfed.org',
        port: 443,
        path: myPath,
        headers: {
            'connection': 'keep-alive'
        }
    };
    logger('getSeries FRED with path=%s',options.path);
    https.get(options, function(result) {
        if (result.statusCode >=200 && result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });
            result.on('end',function() {
                var json = JSON.parse(xml);
                var mySeries = json.observations;
                res.send(makeTableFred(mySeries,series));
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
