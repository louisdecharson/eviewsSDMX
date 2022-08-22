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

// Modules
import { parseString } from "xml2js";
import Debug from "debug";
import * as shortid from "shortid";

import * as buildHTML from "../render/buildHTML.js";
import { parserError, unknownProviderError } from "./utils/errors.js";
import { Provider, Context } from "./utils/provider.js";
import { handleRequest } from "./utils/request.js";
import { stripPrefix } from "./utils/helpers.js";
import * as rabbit from "../queue/rabbit.js";

const logger = Debug("fetcher");
const appTimeout = 29500; // Timeout in ms for request to

export const XML_PARSER_OPTIONS = {
  tagNameProcessors: [stripPrefix],
  mergeAttrs: true,
};

function getErrorMessage(errorCode) {
  let message = "";
  if (errorCode === 500) {
    message = "Internal Server Error";
    return message;
  }
  return message;
}
// Check if element is an array
function isInArray(it, arr) {
  return arr.indexOf(it) > -1;
}

/**
 * List all resources of a provider
 */
export function getAllDataFlow(req, res) {
  const { provider } = req.params;
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const providerInstance = new Provider(provider);
    const url = providerInstance.getAllDataflowUrl();
    const contentType = "application/vnd.sdmx.structure+xml; version=2.1";
    const context = new Context(provider, "dataflow");
    handleRequest(url, contentType, context).then(({ requestErr, content }) => {
      if (requestErr) {
        res.status(500).send(requestErr);
      } else {
        parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
          if (xmlParserErr === null) {
            const data = [];
            try {
              const datasets =
                obj.Structure.Structures[0].Dataflows[0].Dataflow;
              datasets.forEach((it) => {
                const datasetId = it.id;
                let datasetName = it.Name;
                // const dsdId = it.Structure[0].Ref[0].id;
                // const agency = it.Structure[0].Ref[0].agencyID;
                if (datasetName.length > 1) {
                  datasetName.forEach((item, index) => {
                    switch (item["xml:lang"][0]) {
                      case "fr":
                        datasetName = it.Name[index]["_"];
                        break;
                      case "en":
                        datasetName = it.Name[index]["_"];
                        break;
                      default:
                        datasetName = it.Name[0]["_"];
                    }
                  });
                } else {
                  datasetName = it.Name[0]["_"];
                }
                data.push([datasetId, datasetName]);
              });
              res.send(buildHTML.dataFlow(data, provider));
            } catch (parserErr) {
              logger(parserErr);
              res.status(500).send(parserError(provider, "dataflow", url));
            }
          } else {
            logger(xmlParserErr);
            res.status(500).send(parserError(provider, "dataflow", url));
          }
        });
      }
    });
  }
}

function _getFooterMessage(obj) {
  const footer = obj.StructureSpecificData.Footer;
  // Eurostat is storing error a dataset too big to retrieve
  // in the footer message
  let footerMessage;
  try {
    footerMessage = footer[0].Message[0].code[0];
  } catch (error) {
    footerMessage = footer;
  }
  return footerMessage;
}

export function getDataFlow(req, res) {
  const { provider, dataset } = req.params;
  const userTimeout = req.query.timeout;
  const fetchTimeout = userTimeout === undefined ? 5000 : +userTimeout;
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const providerInstance = new Provider(provider);
    providerInstance.getDimension(null, null, dataset, (err, dimensions) => {
      if (err) {
        res.send(err);
      } else {
        const url = providerInstance.getDataflowUrl(dataset);
        const contentType =
          "application/vnd.sdmx.structurespecificdata+xml;version=2.1";
        const context = new Context(provider, "dataflow");
        handleRequest(url, contentType, context, false, fetchTimeout).then(
          ({ error, content }) => {
            if (error) {
              if (error.code === "ETIMEDOUT") {
                const errorMessage =
                  'the dataset is too big to retrieve all the timeseries. You can increase timeout by adding "?timeout=" at the end of the url (default is 5000ms)';
                res.send(
                  buildHTML.detailDataset(
                    provider,
                    null,
                    dataset,
                    dimensions,
                    errorMessage
                  )
                );
              } else {
                res.send(
                  buildHTML.detailDataset(
                    provider,
                    null,
                    dataset,
                    dimensions,
                    error
                  )
                );
              }
            } else {
              parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
                if (xmlParserErr) {
                  res.status(500).send(parserError(provider, "dataflow", url));
                } else {
                  try {
                    const footer = _getFooterMessage(obj);
                    if (footer === "413") {
                      res.send(
                        buildHTML.detailDataset(
                          provider,
                          null,
                          dataset,
                          dimensions,
                          "Dataset is too big to retrieve"
                        )
                      );
                    } else if (footer != null) {
                      const errorMessage = `Error when retrieving list of series. Error code ${footer}. Error message: ${getErrorMessage(
                        footer
                      )}`;
                      res.status(footer).send(errorMessage);
                    } else {
                      const vTS = obj.StructureSpecificData.DataSet[0].Series;
                      res.send(
                        buildHTML.detailDataset(
                          provider,
                          vTS,
                          dataset,
                          dimensions,
                          null
                        )
                      );
                    }
                  } catch (parserErr) {
                    res
                      .status(500)
                      .send(parserError(provider, "dataset information", url));
                  }
                }
              });
            }
          }
        );
      }
    });
  }
}

// Download a Dataset

// Parameters :
// There are two kind of parameters, both are passed into the URL by the user
// - Dimensions of the datasets : like frequency, geo, etc.
// - Filters : like startPeriod, endPeriod, etc
// Both should not be passed the same way to sdmx providers:
// - Dimensions should be ordered and separated by dots and are parts of the path.
// - Filters are separated by & and passed as standards params in the URL (ie: ?name=value)
// NAME OF VARIABLES :
// + reqParams = dictionnary of all params passed by the user
// + authParams = array of the set of dimensions of the dataset (retreived with getDim)
// + dimRequested = string of the ordered dimensions separated by dots passed by the
//                  use. dimRequested should be a sub-set of authParams.

const QUERY_PARAMETERS = new Set([
  "startPeriod",
  "endPeriod",
  "firstNObservations",
  "lastNObservations",
]);
function _getQueryParameters(rawParams) {
  const params = {};
  Object.keys(rawParams).forEach((p) => {
    if (p in QUERY_PARAMETERS) {
      params[p] = rawParams[p];
    } else if (p.toUpperCase() === "FREQUENCY") {
      params.FREQ = rawParams[p];
    } else {
      params[p.toUpperCase()] = rawParams[p];
    }
  });
  logger(`Function: _getQueryParameters. Return:${JSON.stringify(params)}`);
  return params;
}

/**
 * Get parameters from {a: "foo", b: "bar"} to ?a=foo&b=bar
 * @param {object} parameters - dict-like
 */
function _formatQueryParameters(parameters) {
  let params = "";
  Object.keys(parameters).forEach((it, ind, array) => {
    if (ind === 0) {
      params += "?";
    }
    params += `${it.toString()}=${parameters[it]}`;
    if (ind < array.length - 1) {
      params += "&";
    }
  });
  logger(
    `Function: _formatQueryParameters. Input: ${JSON.stringify(
      parameters
    )}. Return:${JSON.stringify(params)}`
  );
  return params;
}

/**
 * Splits between filters (parameters) from users for dataset dimension
 * and filters such as startPeriod or endPeriod
 * @param {object} parameters - parameters from URL request
 * @param {Array} dimensions - array of dimensions for a dataset / series
 */
function _decipherParameters(parameters, dimensions) {
  let query = "";
  let noDimensionRequested = true;
  logger(
    `Function: decipherParameters. Input: ${JSON.stringify(
      parameters
    )}, ${JSON.stringify(dimensions)}`
  );
  dimensions.forEach((item, index) => {
    if (item in parameters) {
      noDimensionRequested = false;
      const suffix = index < dimensions.length - 1 ? "." : "";
      query += `${parameters[item]}${suffix}`;
      delete parameters[item];
    } else if (index < dimensions.length - 1) {
      query += ".";
    }
  });
  // if no dimension is requested by user in parameters
  // then query is not .... but 'all'
  query = noDimensionRequested ? "all" : query;
  const params = _formatQueryParameters(parameters);

  return { params, query };
}

export function retrieveDataset(
  provider,
  dataset,
  dimensions,
  listOnly,
  url,
  contentType,
  context,
  res
) {
  handleRequest(url, contentType, context).then(({ error, content }) => {
    if (error) {
      res.status(500).send(error);
    } else {
      parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
        if (xmlParserErr === null) {
          try {
            const timeseries = obj.StructureSpecificData.DataSet[0].Series;
            let table;
            if (listOnly) {
              table = buildHTML.detailDataset(
                provider,
                timeseries,
                dataset,
                dimensions,
                null,
                false
              );
            } else {
              table = buildHTML.makeTable(
                timeseries,
                dataset,
                dimensions.arrDim
              );
            }
            res.send(table);
          } catch (parserErr) {
            try {
              const footer =
                obj.StructureSpecificData.Footer[0].Message[0].code[0];
              if (footer === "413") {
                res.redirect("./413.html");
              } else {
                res.status(500).send(parserError(provider, "dataset", url));
              }
            } catch (_) {
              res.status(500).send(parserError(provider, "dataset", url));
            }
          }
        } else {
          res.status(500).send(parserError(provider, "dataset", url));
        }
      });
    }
  });
}

/**
 * Retrieves dataset information
 * @param {object} req - request object
 * @param {object} res = response object
 * @param {boolean} listOnly = if true then only the list is retrieved
 * @param {boolean} bigDataset = if true then an id and background job is created
      using queue
 */
function handleDatasetRequest(req, res, listOnly = false, bigDataset = false) {
  const { provider } = req.params;
  const providerInstance = new Provider(provider);
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const dataset =
      provider.toUpperCase() !== "EUROSTAT"
        ? req.params.dataset.toUpperCase()
        : req.params.dataset;
    providerInstance.getDimension(null, null, dataset, (err, dim) => {
      if (err) {
        res.send(err);
      } else {
        const dimensions = dim.arrDim;
        const parameters = _getQueryParameters(req.query);
        const { params, query } = _decipherParameters(parameters, dimensions);
        const url = providerInstance.getDatasetUrl(dataset, query, params);
        const contentType =
          "application/vnd.sdmx.structurespecificdata+xml;version=2.1";
        const context = new Context(provider, "dataset");
        if (bigDataset) {
          const conn = rabbit.get();
          const id = shortid.generate();
          const task = JSON.stringify({
            provider,
            dataset,
            dimensions,
            listOnly,
            url,
            contentType,
            context,
            id,
          });
          rabbit.sendMessage(conn, task);
          res.send(buildHTML.bigDataset(id));
        } else {
          retrieveDataset(
            provider,
            dataset,
            dim,
            listOnly,
            url,
            contentType,
            context,
            res
          );
        }
      }
    });
  }
}

export function getDataSet(req, res) {
  handleDatasetRequest(req, res, false, false);
}

export function getSeries(req, res) {
  const seriesParam = req.params.series;
  const provider = req.params.provider.toUpperCase();
  const providerInstance = new Provider(provider);
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const params = _formatQueryParameters(req.query);
    const { series, dataset } =
      providerInstance.getSeriesAndDataset(seriesParam);
    const url = providerInstance.getSeriesUrl(series, params, dataset);
    const contentType =
      "application/vnd.sdmx.structurespecificdata+xml;version=2.1";
    const context = new Context(provider, "dataset");
    handleRequest(url, contentType, context).then(({ error, content }) => {
      if (error) {
        res.send(error);
      } else {
        parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
          if (xmlParserErr === null) {
            try {
              const timeseries = obj.StructureSpecificData.DataSet[0].Series;
              res.send(buildHTML.makeTable(timeseries, dataset, []));
            } catch (parserErr) {
              res.status(500).send(parserError(provider, "series", url));
            }
          } else {
            res.status(500).send(parserError(provider, "dataset", url));
          }
        });
      }
    });
  }
}

export function getCodeList(req, res) {
  const { provider, codelist } = req.params;
  const providerInstance = new Provider(provider);
  const { dsdId } = req.query;
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const url = providerInstance.getCodelistUrl(codelist, dsdId);
    const contentType = "application/vnd.sdmx.structure+xml; version=2.1";
    const context = new Context(provider, "codelist");
    handleRequest(url, contentType, context).then(({ error, content }) => {
      if (error) {
        res.send(error);
      } else {
        parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
          if (xmlParserErr === null) {
            try {
              const data = obj.Structure.Structures[0].Codelists[0].Codelist;
              let codes = "";
              if (data.length === 1) {
                Object.keys(data).every((d) => {
                  if (data[d].id[0] === codelist) {
                    codes = data[d];
                    return false;
                  }
                  return true;
                });
              } else {
                codes = data[0];
              }
              const codelistId = codes.id[0];
              const codelistCode = codes.Code;
              res.send(buildHTML.codeList(codelistCode, codelistId));
            } catch (parserErr) {
              res.status(500).send(parserError(provider, "codelist", url));
            }
          } else {
            res.status(500).send(parserError(provider, "codelist", url));
          }
        });
      }
    });
  }
}

// Retrieve data from SDMX URL
export function getDatafromURL(req, res) {
  const myUrl = req.query.url.replace(/\'*/g, "").replace(/\s/g, "+");
  const urlParsed = url.parse(myUrl);
  const { hostname, protocol, pathname } = urlParsed;
  logger(
    "Receive request for host: %s, with path: %s, over protcol: %s",
    hostname,
    protocol,
    pathname
  );
  const url = `${protocol}//${hostname}${pathname}`;
  const contentType =
    "application/vnd.sdmx.structurespecificdata+xml;version=2.1";
  const agent = {
    ciphers: "ALL",
    secureProtocol: "TLSv1_1_method",
  };

  handleRequest(url, contentType, true, appTimeout, agent).then(
    ({ error, content }) => {
      if (error) {
        res.send(error);
      } else {
        parseString(content, XML_PARSER_OPTIONS, (err, obj) => {
          try {
            const timeseries = obj.StructureSpecificData.Dataset[0].Series;
            const pageTitle = `Request to ${hostname}`;
            res.send(buildHTML.makeTable(timeseries, pageTitle, []));
          } catch (xmlParserErr) {
            res.status(500).send(parserError(hostname, "SDMX request", url));
          }
        });
      }
    }
  );
}

export function redirectURL(req, res) {
  const { myUrl } = req.body;
  const route = `/req?url='${myUrl}'`;
  logger(`Redirection to ${route}`);
  res.redirect(route);
}

export function getList(req, res) {
  handleDatasetRequest(req, res, true);
}
// export function getList(req, res) {
//   const { provider } = req.params;
//   const providerInstance = new Provider(provider);
//   if (!Provider.isKnown(provider)) {
//     res.send(unknownProviderError(provider));
//   } else {
//     const dataset =
//       provider !== "EUROSTAT"
//         ? req.params.dataset.toUpperCase()
//         : req.params.dataset;
//     providerInstance.getDimension(null, null, dataset, (err, dim) => {
//       if (err) {
//         res.send(err);
//       } else {
//         const dimensions = dim.arrDim;
//         const parameters = _getQueryParameters(req.query);
//         const { params, query } = _decipherParameters(parameters, dimensions);
//         const url = providerInstance.getDatasetUrl(dataset, query, params);
//         const contentType =
//           "application/vnd.sdmx.structurespecificdata+xml;version=2.1";
//         const context = new Context(provider, "dataset");
//         handleRequest(url, contentType, context).then(({ error, content }) => {
//           if (error) {
//             res.send(error);
//           } else {
//             parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
//               if (xmlParserErr === null) {
//                 try {
//                   const timeseries =
//                     obj.StructureSpecificData.DataSet[0].Series;
//                   res.send(
//                     buildHTML.List(provider, timeseries, dataset, dimensions)
//                   );
//                 } catch (parserErr) {
//                   try {
//                     const footer =
//                       obj.StructureSpecificData.Footer[0].Message[0].code[0];
//                     if (footer === "413") {
//                       res.redirect("./413.html");
//                     } else {
//                       res.send(500).send(parserError(provider, "dataset", url));
//                     }
//                   } catch (_) {
//                     res.send(500).send(parserError(provider, "dataset", url));
//                   }
//                 }
//               } else {
//                 res.send(500).send(parserError(provider, "dataset", url));
//               }
//             });
//           }
//         });
//       }
//     });
//   }
// }

export function getBigDataSet(req, res) {
  handleDatasetRequest(req, res, false, true);
}

// Send temporary file
export function getTemp(req, res) {
  const { id } = req.params;
  logger("Request for temporary file with id: %s", id);
  if (id.slice(-4) === "html") {
    // Being here means the file does not exist yet (or does
    // not exist anymore).
    // Send wait to the user
    res.send(buildHTML.bigDatasetWait());
  } else {
    // else let Rabbit send us the route
    rabbit.sendTempFile(id, (route) => {
      res.redirect(route);
    });
  }
}

// FOR TESTING TIMEOUT
// exports.testTimeout = function(req,res) {
//     console.log('Request received');
//     setTimeout(function() {
//         console.log(req.timedout);
//         res.send('OK');
//         console.log('Response sent.');
//     }, 30000);
//     console.log('Waiting...');
// };
