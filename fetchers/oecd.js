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
import { parseString } from "xml2js";
import Debug from "debug";
import * as buildHTML from "../render/buildHTML.js";
import { stripPrefix } from "./utils/helpers.js";
import { parserError, fetcherError } from "./utils/errors.js";

const logger = Debug("oecd");

const OECD_URL = "http://stats.oecd.org/restsdmx/sdmx.ashx/";
const XML_PARSER_OPTIONS = {
  tagNameProcessors: [stripPrefix],
  mergeAttrs: true,
};

export function getSeries(req, res) {
  const { series, dataset } = req.params;
  const params = Object.entries(req.query)
    .map((x) => `${x[0]}=${x[1]}`)
    .join("&");
  const url = `${OECD_URL}GetData/${dataset}/${series}?${params}`;
  const options = {
    method: "GET",
    headers: {
      connection: "keep-alive",
    },
  };
  logger("getSeries OECD with path=%s", options.url);
  got(url, options)
    .then((response) => {
      parseString(response.body, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
        if (xmlParserErr === null) {
          try {
            const data = obj.MessageGroup.DataSet[0];
            const family = data.KeyFamilyRef;
            const timeseries = data.Series;
            res.send(buildHTML.makeTableOECD(timeseries, series, family));
          } catch (error) {
            logger(error);
            res.status(500).send(parserError("OECD", "series", url));
          }
        } else {
          logger(xmlParserErr);
          res.status(500).send(parserError("OECD", "series", url));
        }
      });
    })
    .catch((error) => {
      logger(error);
      const htmlErrorCode = error.message.match(/\d/g).join("");
      res
        .status(500)
        .send(
          fetcherError(
            "OECD",
            htmlErrorCode,
            "series",
            url,
            `${error.message} - ${error.code}`
          )
        );
    });
}

export function getAllDataFlow(req, res) {
  const url = `${OECD_URL}GetDataStructure/all?format=SDMX-ML`;
  const options = {
    method: "GET",
    headers: {
      connection: "keep-alive",
    },
  };
  logger("getAllDataflow OECD with path=%s", options.url);
  got(url, options)
    .then((response) => {
      parseString(response.body, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
        if (xmlParserErr === null) {
          try {
            const data = [];
            const datasets = obj.Structure.KeyFamilies[0].KeyFamily;
            datasets.forEach((x) => {
              data.push([x.id, x.Name[0]["_"]]);
            });
            res.send(buildHTML.dataFlow(data, "oecd"));
          } catch (error) {
            logger(error);
            res.status(500).send(parserError("OECD", "dataflows", url));
          }
        } else {
          logger(xmlParserErr);
          res.status(500).send(parserError("OECD", "dataflows", url));
        }
      });
    })
    .catch((error) => {
      logger(error);
      const htmlErrorCode = error.message.match(/\d/g).join("");
      res
        .status(500)
        .send(
          fetcherError(
            "OECD",
            htmlErrorCode,
            "dataflows",
            url,
            `${error.message} - ${error.code}`
          )
        );
    });
}

export function getDataflow(req, res) {
  const { dataset } = req.params;
  const url = `${OECD_URL}GetDataStructure/${dataset}`;
  const options = {
    method: "GET",
    headers: {
      connection: "keep-alive",
    },
  };
  logger("getDataflow OECD with path=%s", url);
  got(url, options)
    .then((response) => {
      parseString(response.body, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
        if (xmlParserErr === null) {
          try {
            const dim =
              obj.Structure.KeyFamilies[0].KeyFamily[0].Components[0].Dimension;
            res.send(buildHTML.OECDDimensions(dim, dataset));
          } catch (error) {
            logger(error);
            res.status(500).send(parserError("OECD", "dataflow", url));
          }
        } else {
          logger(xmlParserErr);
          res.status(500).send(parserError("OECD", "dataflow", url));
        }
      });
    })
    .catch((error) => {
      logger(error);
      const htmlErrorCode = error.message.match(/\d/g).join("");
      res
        .status(500)
        .send(
          fetcherError(
            "OECD",
            htmlErrorCode,
            "dataflow",
            url,
            `${error.message} - ${error.code}`
          )
        );
    });
}

export function getCodeList(req, res) {
  const { codelist: codelistRequested } = req.params;
  const dataset = req.query.Dataset;
  const codelistID = `CL_${dataset}_${codelistRequested}`;
  const url = `${OECD_URL}GetDataStructure/${dataset}/all?format=SDMX-ML`;
  const options = {
    method: "GET",
    headers: {
      connection: "keep-alive",
    },
  };
  logger(
    "getCodeList OECD with path=%s,codelist=%s for dataset=%s",
    url,
    codelistRequested,
    dataset
  );
  got(url, options)
    .then((response) => {
      parseString(response.body, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
        if (xmlParserErr === null) {
          try {
            const codelists = obj.Structure.CodeLists[0].CodeList;
            for (const codelist of codelists) {
              if (codelist.id[0] === codelistID) {
                res.send(
                  buildHTML.OECDCodeList(codelist, codelistRequested, dataset)
                );
                break;
              }
            }
          } catch (error) {
            logger(error);
            res.status(500).send(parserError("OECD", "codelist", url));
          }
        } else {
          logger(xmlParserErr);
          res.status(500).send(parserError("OECD", "codelist", url));
        }
      });
    })
    .catch((error) => {
      logger(error);
      const htmlErrorCode = error.message.match(/\d/g).join("");
      res
        .status(500)
        .send(
          fetcherError(
            "OECD",
            htmlErrorCode,
            "codelist",
            url,
            `${error.message} - ${error.code}`
          )
        );
    });
}
