// Copyright (C) 2022 Louis de Charsonville

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
import got from "got";
import request from "request";
import Debug from "debug";
import * as buildHTML from "../render/buildHTML.js";

const BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

const logger = Debug("bls");

async function fetchBLS(series, startYear, endYear, apiKey) {
  const payload = JSON.stringify({
    seriesid: series,
    startyear: startYear,
    endyear: endYear,
    registrationkey: apiKey,
  });
  const options = {
    body: payload,
    method: "POST",
    headers: {
      connection: "keep-alive",
      "Content-Type": "application/json",
      "user-agent": "nodeJS",
    },
  };
  try {
    logger("getSeries BLS with path=%s and payload=%s", BLS_URL, payload);
    const response = await got(BLS_URL, options);
    if (response.statusCode >= 200 && response.statusCode) {
      try {
        const parsedResults = JSON.parse(response.body).Results.series;
        const html = buildHTML.makeTableBLS(parsedResults);
        return Promise.resolve(html);
      } catch (parserError) {
        return "Parsing error";
      }
    } else {
      return response.statusCode;
    }
  } catch (error) {
    return error;
  }
}

export function getSeries(req, res) {
  const series = req.params.series.split("+");
  const { startYear, endYear } = req.query;
  const { apiKey } = req.params;
  fetchBLS(series, startYear, endYear, apiKey).then((html) => {
    res.status(200).send(html);
  });
}
