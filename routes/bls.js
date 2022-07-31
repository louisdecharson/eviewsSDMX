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
import Debug from 'debug';
import * as buildHTML from './buildHTML.js';

const BLS_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

const logger = Debug('bls');


export function getSeries(req, res) {
  const series = req.params.series.split('+'),
        startYear = req.query['startyear'],
        endYear = req.query['endyear'],
        apiKey = req.params.apiKey;
  res.send(blsSeriesFetcher(series, startYear, endYear, apiKey));
};

function blsSeriesFetcher(series, startYear, endYear, apiKey) {
  const payload = JSON.stringify({
    seriesid: series,
    startyear: startYear,
    endYear: endYear,
    registrationkey: apiKey
  });
  const requestOptions = {
    url: BLS_URL,
    body: payload,
    method: 'POST',
    headers: {
      'connection': 'keep-alive',
      'Content-Type': 'application/json',
      'user-agent': 'nodeJS'
    }
  };
  logger('getSeries BLS with path=%s and payload=%s',options.url,payloadData);
  request(options,function(err, result, body) {
    logger('Answer received: %s',body);
    if (!err & result.statusCode >=200 && result.statusCode < 400) {
      try {
        const data = JSON.parse(body),
              parsedResults = data.Results.series[0],
              table = buildHTML.makeTableBLS(parsedResults);
        return table;
      } catch (error) {
        return "Parsing error";
      }
    } else {
      return result.statusCode;
    }
  });
};
