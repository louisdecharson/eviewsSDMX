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
    fs = require('fs'),
    debug = require('debug')('buba'),
    csv = require('fast-csv'),
    buildHTML = require('./buildHTML');

const urlBuba_pre = 'https://www.bundesbank.de/cae/servlet/StatisticDownload?tsId=',
      urlBuba_post = '&its_csvFormat=en&its_fileFormat=csv&mode=its';

exports.getSeries = function(req,res) {
    var series = req.params.series,
        url = urlBuba_pre + series + urlBuba_post;
    var dest = './temp.csv';
    var f = fs.createWriteStream(dest);
    request
        .get(url)
        .on('error', function(err) {
            console.log(err);
            res.send(err);
            f.unlink(dest);
        })
        .pipe(f.on('finish',function() {
            f.close(function() {
                var finalData = [];
                csv
                    .fromPath(dest, {ignoreEmpty:true,headers: ["date","value","flags"]})
                    .on("data",function(data){
                        finalData.push(data);
                    })
                    .on("end",function() {
                        buildHTML.makeTableBuba(finalData,function(html){res.send(html);});
                        fs.unlink(dest,function(){});
                    });
            });
        }));
};
