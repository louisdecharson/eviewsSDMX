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
import Debug from "debug";
import * as buildHTML from "../render/buildHTML.js";
import { standardError } from "./utils/errors.js";
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
  logger("getSeries BLS with path=%s and payload=%s", BLS_URL, payload);
  try {
    const response = await got(BLS_URL, options);
    if (response.statusCode >= 200 && response.statusCode < 400) {
      try {
        const parsedBody = JSON.parse(response.body);
        if (
          parsedBody.status !== "REQUEST_SUCCEEDED" ||
          parsedBody.message.length > 0
        ) {
          const msg = `
  <div>
    <p>
    The request to <code>${BLS_URL}</code> failed.
    See below the status and response received from BLS's servers:
    </p>
    <ul>
      <li>Status: <code>${parsedBody.status}</code>.</li>
      <li>Message: ${parsedBody.message}.</li>
    </ul>
  </div>
  `;
          return Promise.reject(new Error(msg));
        } else {
          const parsedResults = parsedBody.Results.series;
          const html = buildHTML.makeTableBLS(parsedResults);
          return Promise.resolve(html);
        }
      } catch (parserError) {
        return Promise.reject(
          new Error(`
  <p>The request to <code>${BLS_URL}</code> succeeded but we've failed to parse the return object.</p>
  <div><strong>Error</strong><pre>${parserError.message}</pre></div>
  `)
        );
      }
    } else {
      return Promise.reject(
        new Error(`
  <p>The request to <code>${BLS_URL}</code> failed with status ${response.statusCode} - ${response.statusMessage}</p>`)
      );
    }
  } catch (error) {
    return Promise.reject(
      new Error(`
  <p>The request to <code>${BLS_URL}</code> failed with error: <pre>${error.message}</pre></p>`)
    );
  }
}

export function getSeries(req, res) {
  const series = req.params.series.split("+");
  const { startYear, endYear } = req.query;
  const { apiKey } = req.params;
  fetchBLS(series, startYear, endYear, apiKey)
    .then((html) => {
      res.status(200).send(html);
    })
    .catch((error) => {
      res.status(400).send(standardError(error.message));
    });
}
