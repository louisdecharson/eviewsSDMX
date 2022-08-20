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
// =====================================================================

// PACKAGES
import * as https from "https";
import Debug from "debug";
import { makeTableFred } from "../render/buildHTML.js";

const logger = Debug("fred");

export function getSeries(req, res) {
  const { series, apiKey } = req.params;
  const myPath =
    "/fred/series/observations?series_id=" +
    series +
    "&api_key=" +
    apiKey +
    "&file_type=json";
  const options = {
    hostname: "api.stlouisfed.org",
    port: 443,
    path: myPath,
    headers: {
      connection: "keep-alive",
    },
  };
  logger("getSeries FRED with path=%s", options.path);
  https.get(options, (result) => {
    if (result.statusCode >= 200 && result.statusCode < 400) {
      let xml = "";
      result.on("data", (chunk) => {
        xml += chunk;
      });
      result.on("end", () => {
        const json = JSON.parse(xml);
        const data = json.observations;
        res.send(makeTableFred(data, series));
      });
    } else {
      let msg;
      if (result.statusCode === 429) {
        msg = "Too many requests";
      } else {
        msg = "";
      }
      const e =
        "Error: " +
        result.statusCode +
        " | " +
        msg +
        " | Headers " +
        JSON.stringify(result.headers) +
        " | ";
      res.send(e);
    }
  });
}
