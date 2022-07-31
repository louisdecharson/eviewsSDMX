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
import request from 'request';
import * as fs from 'fs';
import * as csv from 'fast-csv';
import { makeTableBuba } from './buildHTML.js';

const URL_BUBA = 'https://api.statistiken.bundesbank.de/rest/download/',
      URL_BUBA_DEFAULT_PARAMS = '?format=csv&lang=en';

export function getSeries(req,res) {
  const urlSeries = req.params.series,
      url = URL_BUBA + urlSeries.replace('.','/') + URL_BUBA_DEFAULT_PARAMS,
        dest = './temp.csv',
        f = fs.createWriteStream(dest);
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
          .parseFile(dest, {ignoreEmpty:true,headers: ["date","value","flags"]})
          .on("data",function(data){
            finalData.push(data);
          })
          .on("end",function() {
            makeTableBuba(finalData,function(html){res.send(html);});
            fs.unlink(dest,function(){});
          });
      });
    }));
};
