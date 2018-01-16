// Copyright (C) 2018 Louis de Charsonville

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
    xml2js = require('xml2js'),
    debug = require('debug')('oecd'),
    buildHTML = require('./buildHTML');

const urlOECD = 'http://stats.oecd.org/restsdmx/sdmx.ashx/GetData/'; 


function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

// FETCHER
exports.getSeries = function(req,res) {
    var series = req.params.series,
        dataset = req.params.dataset,
        keys = Object.keys(req.query),
        params = "?";
    keys.forEach(function(it,ind,arr) {
        params += it.toString() + "=" + req.query[it] ;
        if (ind<arr.length-1) {
            params += "&";
        }
    });
    var myURL = urlOECD + dataset + '/' + series + params,
        options = {
            url: myURL,
            method: 'GET',
            headers: {
                'connection': 'keep-alive'
            }
        };
    debug('getSeries OECD with path=%s',options.url);
    request(options,function(e,r,b){
        if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                if(err === null) {
                    try {
                        var data = obj.MessageGroup.DataSet[0],
                            dataset = data.KeyFamilyRef;
                        var vTS = data.Series;
                        if (!req.timedout) {
                            res.send(buildHTML.makeTableOECD(vTS,series,dataset));
                        }}
                    catch(error) {
                        debug(error);
                        var errorMessage = "Error parsing SDMX at: " + options.url;
                        res.status(500).send(errorMessage);
                    }
                } else {
                    res.send(err);
                }
            });
        } else {
            res.status(r.statusCode).send(r.statusMessage);
            debug(e);
        }
    }); 
};
