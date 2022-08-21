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
import { standardError } from "./utils/errors.js";

const logger = Debug("fred");

const FRED_API = "api.stlouisfed.org";

function addFormattedHeaders(headers) {
  return `
<div>
  <strong>Response headers</strong> (can help debugging):
  <pre>${JSON.stringify(headers)}</pre>
</div>
`;
}

export function getSeries(req, res) {
  const { series, apiKey } = req.params;
  const path =
    "/fred/series/observations?series_id=" +
    series +
    "&api_key=" +
    apiKey +
    "&file_type=json";
  const options = {
    hostname: FRED_API,
    port: 443,
    path,
    headers: {
      connection: "keep-alive",
    },
  };
  logger("getSeries FRED with path=%s", path);
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
      if (result.statusCode === 429) {
        const msg = `<p>FRED servers responded to the request with an error 429,
e.g. too many requests. You've probably made too many requests using the same API key.
Wait before making a new request.</p>
<p>Url used: <code>https://${FRED_API}${path}</code></p>
${addFormattedHeaders(result.headers)}
`;
        res.send(standardError(msg));
      } else {
        const msg = `<p>FRED servers responded to the request with an error
${result.statusCode} - ${result.statusMessage}.</p>
<p>Url used: <code>https://${FRED_API}${path}</code><p>
${addFormattedHeaders(result.headers)}
`;
        res.send(standardError(msg));
      }
    }
  });
}
