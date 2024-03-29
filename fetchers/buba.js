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
import * as fs from "fs";
import * as csv from "fast-csv";
import { makeTableBuba } from "../render/buildHTML.js";
import { standardError } from "./utils/errors.js";

const URL_BUBA = "https://api.statistiken.bundesbank.de/rest/download/";
const URL_BUBA_DEFAULT_PARAMS = "?format=csv&lang=en";

/**
 * Retrieves series from BUBA Rest API.
 * The function uses got to make a request, stream the result (a csv file) to a
 * file write stream that writes it to disk and then use makeTableBuba to
 * get it as a csv file.
 */
export function getSeries(req, res) {
  const urlSeries = req.params.series;
  const url = URL_BUBA + urlSeries.replace(".", "/") + URL_BUBA_DEFAULT_PARAMS;
  const dest = "./temp.csv";
  const fileWriteStream = fs.createWriteStream(dest);
  try {
    got
      .stream(url)
      .on("error", (error) => {
        const msg = `
<div>Request to <code>${url}</code> failed with error <pre>${error.message}</pre>
</div>
`;
        res.status(400).send(standardError(msg));
      })
      .pipe(
        fileWriteStream.on("finish", () => {
          fileWriteStream.close(() => {
            const finalData = [];
            csv
              .parseFile(dest, {
                ignoreEmpty: true,
                headers: ["date", "value", "flags"],
              })
              .on("data", (data) => {
                finalData.push(data);
              })
              .on("end", () => {
                fs.unlink(dest, () => {});
                res.status(200).send(makeTableBuba(finalData));
              });
          });
        })
      );
  } catch (error) {
    const msg = `
<div>Request to <code>${url}</code> failed with error <pre>${error.message}</pre>
</div>
`;
    res.status(400).send(standardError(msg));
  }
}
