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
// =====================================================================

// Modules
import { parseString } from "xml2js";
import * as https from "https";
import request from "request";
import Debug from "debug";
import * as shortid from "shortid";
import * as http from "follow-redirects";
import * as amqp from "amqplib/callback_api.js";
import { createRequire } from "module";

import * as buildHTML from "./buildHTML.js";
import { parserError, unknownProviderError } from "./errors.js";

import { Provider, Context } from "./provider.js";
import { handleRequest } from "./request.js";
import { stripPrefix } from "../helpers.js";
import * as rabbit from "../rabbit.js";

const logger = Debug("fetcher");

const require = createRequire(import.meta.url);
const providers = require("./providers.json");

const appTimeout = 29500; // TimeOut for Request

// RABBIT MQ

// Utilitaries
// ===========

const XML_PARSER_OPTIONS = {
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
                const dsdId = it.Structure[0].Ref[0].id;
                const agency = it.Structure[0].Ref[0].agencyID;
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
                data.push([datasetId, dsdId, agency, datasetName, provider]);
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
  } finally {
    return footerMessage;
  }
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
        const contentType = "application/vnd.sdmx.structure+xml; version=2.1";
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
function _formatParameters(rawParams) {
  let params = {};
  for (p in rawParams) {
    if (p in QUERY_PARAMETERS) {
      params[p] = rawParams[p];
    } else if (p.toUpperCase() === "FREQUENCY") {
      params["FREQ"] = rawParams[p];
    } else {
      params[p.toUpperCase()] = rawParams[p];
    }
  }
  return params;
}

/**
 * Get parameters from {a: "foo", b: "bar"} to ?a=foo&b=bar
 * @param {object} parameters - dict-like
 */
function _getParams(parameters) {
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
  dimensions.forEach((item, index) => {
    if (item in parameters) {
      noDimensionRequested &= false;
      const suffix = index < dimensions.length - 1 ? "." : "";
      query += `${parameters[index]}${suffix}`;
      delete parameters[item];
    } else if (index < dimensions.length - 1) {
      query += ".";
    }
  });
  // if no dimension is requested by user in parameters
  // then query is not .... but 'all'
  query = noDimensionRequested ? "all" : query;
  let params = _getParams(parameters);

  return { params, query };
}

export function getDataSet(req, res) {
  const provider = req.params.provider;
  const providerInstance = new Provider(provider);
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const dataset =
      provider !== "EUROSTAT"
        ? req.params.dataset.toUpperCase()
        : req.params.dataset;
    providerInstance.getDimension(null, null, dataset, (err, dim) => {
      if (err) {
        res.send(err);
      } else {
        const dimensions = dim.arrDim;
        const parameters = _formatParameters(req.query);
        const { params, query } = _decipherParameters(parameters, dimensions);
        const url = providerInstance.getDatasetUrl(dataset, query, params);
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
                  const vTS = obj.StructureSpecificData.DataSet[0].Series;
                  res.send(buildHTML.makeTable(vTS, dataset, dimensions));
                } catch (parserErr) {
                  try {
                    const footer =
                      obj.StructureSpecificData.Footer[0].Message[0].code[0];
                    if (footer === "413") {
                      res.redirect("./413.html");
                    } else {
                      res.send(500).send(parserError(provider, "dataset", url));
                    }
                  } catch (_) {
                    res.send(500).send(parserError(provider, "dataset", url));
                  }
                }
              } else {
                res.send(500).send(parserError(provider, "dataset", url));
              }
            });
          }
        });
      }
    });
  }
}

export function getSeries(req, res) {
  const seriesParam = req.params.series;
  const provider = req.params.provider.toUpperCase();
  const providerInstance = new Provider(provider);
  if (!Provider.isKnown(provider)) {
    res.send(unknownProviderError(provider));
  } else {
    const params = _getParams(req.query);
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
              const vTS = obj.StructureSpecificData.DataSet[0].Series;
              res.send(buildHTML.makeTable(vTS, dataset, []));
            } catch (parserErr) {
              res.send(500).send(parserError(provider, "series", url));
            }
          } else {
            res.send(500).send(parserError(provider, "dataset", url));
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
              const data = obj.Structure.Structures[0].Codelists[0].Codelist;
              let codes = "";
              if (data.length === 1) {
                for (var d in data) {
                  if (data[d].id[0] === codelist) {
                    codes = data[d];
                    break;
                  }
                }
              } else {
                codes = data[0];
              }
              const codelistId = codes.id[0];
              const codelistCode = codes.Code;
              res.send(buildHTML.codeList(codelistCode, codelistId));
            } catch (parserErr) {
              res.send(500).send(parserError(provider, "codelist", url));
            }
          } else {
            res.send(500).send(parserError(provider, "codelist", url));
          }
        });
      }
    });
  }
}

// Retrieve data from SDMX URL
export function getDatafromURL(req, res) {
  var myUrl = req.query.url.replace(/\'*/g, "").replace(/\s/g, "+"); // remove ''
  var host = url.parse(myUrl).hostname,
    protocol = url.parse(myUrl).protocol,
    path = url.parse(myUrl).pathname;
  logger(
    "Receive request for host: %s, with path: %s, over protcol: %s",
    host,
    protocol,
    path
  );
  var options = {
    url: protocol + "//" + host + path,
    method: "GET",
    headers: {
      connection: "keep-alive",
      accept: "application/vnd.sdmx.structurespecificdata+xml;version=2.1",
      "user-agent": "nodeJS",
    },
    agentOptions: {
      ciphers: "ALL",
      secureProtocol: "TLSv1_1_method",
    },
    timeout: appTimeout,
  };
  request(options, function (e, r, b) {
    if (e) {
      var errorMessage;
      if (e.code === "ETIMEDOUT") {
        errorMessage = embedErrorMessage(
          "timeout",
          host,
          null,
          "data",
          options.url,
          null
        );
      } else {
        errorMessage = embedErrorMessage(
          "request",
          host,
          e.code,
          "data",
          options.url,
          null
        );
      }
      res.send(errorMessage);
    } else {
      if (r.statusCode >= 200 && r.statusCode < 400) {
        parseString(
          b,
          { tagNameProcessors: [stripPrefix], mergeAttrs: true },
          function (err, obj) {
            if (err === null) {
              try {
                if (typeof obj.StructureSpecificData !== "undefined") {
                  var data = obj.StructureSpecificData.DataSet[0],
                    vTS = data.Series,
                    title = "request to " + host;
                  if (!req.timedout) {
                    res.send(buildHTML.makeTable(vTS, title, []));
                  }
                } else {
                  res.set("Content-type", "text/plain");
                  res.send("The request could not be handled");
                }
              } catch (error) {
                logger(error);
                var errorMessage = embedErrorMessage(
                  "parser",
                  host,
                  null,
                  "data",
                  options.url,
                  null
                );
                res.status(500).send(errorMessage);
              }
            } else {
              logger(err);
              var errorMessage = embedErrorMessage(
                "parser",
                host,
                null,
                "data",
                options.url,
                null
              );
              res.status(500).send(errorMessage);
            }
          }
        );
      } else {
        var errorMessage = embedErrorMessage(
          "fetcher",
          host,
          r.statusCode,
          "data",
          options.url,
          r.statusMessage
        );
        res.send(errorMessage);
        logger(
          "Request to %s failed with code %d and message %s",
          options.url,
          r.statusCode,
          r.statusMessage
        );
      }
    }
  });
}

export function redirectURL(req, res) {
  var myUrl = req.body.myUrl;
  var route = "/req?url='" + myUrl + "'";
  res.redirect(route);
}

export function getList(req, res) {
  var provider = req.params.provider.toUpperCase();
  var protocol = providers[provider.toUpperCase()].protocol,
    host = providers[provider.toUpperCase()].host,
    path = providers[provider.toUpperCase()].path,
    format = providers[provider.toUpperCase()].format,
    agencyID = providers[provider.toUpperCase()].agencyID,
    nodata = providers[provider.toUpperCase()].nodata;
  if (isInArray(provider, Object.keys(providers))) {
    var dataSet = "";
    if (provider !== "EUROSTAT" && provider !== "WEUROSTAT") {
      dataSet = req.params.dataset.toUpperCase();
    } else {
      dataSet = req.params.dataset;
    }

    // All keys to UpperCase
    var key,
      keys = Object.keys(req.query);
    var n = keys.length;
    var reqParams = {};
    while (n--) {
      key = keys[n];
      var kkey = key; // name of the key before it get changed below
      if (key.toUpperCase() === "FREQUENCY") {
        key = "FREQ";
      } else {
        reqParams[key.toUpperCase()] = req.query[kkey];
      }
    }
    var dimRequested = ""; // string fill with ordered dimensions passed by the user in req.params
    if (provider === "WEUROSTAT") {
      var myPath =
        providers[provider].path +
        providers[provider].agencyID +
        "/data/" +
        dataSet;
    } else {
      var myPath = providers[provider].path + "data/" + dataSet;
    }
    logger("getDataset with provider: %s, dataset: %s", provider, dataSet);
    logger("getDataset with path=%s", myPath);
    getDim(provider, null, null, dataSet, function (err, dim) {
      if (err) {
        res.status(500).send(dim); // if err, dim is the errorMessage
      } else {
        var authParams = dim.arrDim; // Authorised dimensions for the dataset.
        var compt = 0;
        authParams.forEach(function (it, ind) {
          if (reqParams[it] != null) {
            if (ind < dim.nbDim - 1) {
              dimRequested += reqParams[it] + ".";
            } else {
              dimRequested += reqParams[it];
            }
            delete reqParams[it];
          } else {
            if (ind < dim.nbDim - 1) {
              dimRequested += ".";
            }
            compt++;
          }
        });
        // When the whole dataSet is requested.
        if (compt == dim.nbDim) {
          dimRequested = "all";
        }
        myPath += "/" + dimRequested;
        if (nodata === "True") {
          myPath += "?detail=nodata&";
        } else {
          myPath += "?";
        }
        Object.keys(reqParams).forEach(function (it, ind, arr) {
          if (ind === 0) {
            myPath += "?";
          }
          myPath += it.toString() + "=" + reqParams[it];
          if (ind < arr.length - 1) {
            myPath += "&";
          }
        });
        var options = {
          url: protocol + "://" + host + myPath,
          headers: {
            connection: "keep-alive",
            accept:
              "application/vnd.sdmx.structurespecificdata+xml;version=2.1",
            "user-agent": "nodeJS",
          },
        };
        logger("auth params: %s", authParams);
        logger("dimensions: %s", dimRequested);
        request(options, function (e, r, b) {
          if (r.statusCode >= 200 && r.statusCode < 400) {
            parseString(
              b,
              { tagNameProcessors: [stripPrefix], mergeAttrs: true },
              function (err, obj) {
                if (err === null) {
                  try {
                    var data = obj.StructureSpecificData.DataSet[0];
                    var vTS = data.Series; // vector of Time Series : vTS
                    if (!req.timedout) {
                      res.send(buildHTML.List(provider, vTS, dataSet, dim));
                    }
                  } catch (error) {
                    logger(error);
                    try {
                      var footer =
                        obj.StructureSpecificData.Footer[0].Message[0].code[0]; // for handling Eurostat errors
                      if (footer === "413") {
                        res.redirect("/413.html");
                        logger("redirecting to 413");
                      } else {
                        logger("Error parser at %s", options.url);
                        var errorMessage = embedErrorMessage(
                          "parser",
                          provider,
                          null,
                          "data",
                          options.url,
                          null
                        );
                        res.status(500).send(errorMessage);
                      }
                    } catch (error2) {
                      logger(error2);
                      var errorMessage = embedErrorMessage(
                        "parser",
                        provider,
                        null,
                        "data",
                        options.url,
                        null
                      );
                      res.status(500).send(errorMessage);
                    }
                  }
                } else {
                  logger(err);
                  res.send(err);
                  var errorMessage = embedErrorMessage(
                    "parser",
                    provider,
                    null,
                    "data",
                    options.url,
                    null
                  );
                  res.status(500).send(errorMessage);
                }
              }
            );
          } else if (r.statusCode === 413) {
            res.redirect("/413.html");
          } else {
            logger(
              "Fetcher ERROR \n + Code: %d \n + Message: %s \n + Url: %s",
              r.statusCode,
              provider,
              options.url
            );
            var errorMessage = embedErrorMessage(
              "fetcher",
              provider,
              r.statusCode,
              "data",
              options.url,
              r.statusMessage
            );
            res.send(errorMessage);
          }
        });
      }
    });
  } else {
    var errorMessage =
      "The provider " + provider + "is not supported by the application.";
    errorMessage =
      'List of supported providers is <a href="/providers">here</a>.';
    res.status(404).send(embedErrorMessage(errorMessage));
  }
}

export function getBigDataSet(req, res) {
  var provider = req.params.provider.toUpperCase();
  var protocol = providers[provider.toUpperCase()].protocol,
    host = providers[provider.toUpperCase()].host,
    path = providers[provider.toUpperCase()].path,
    format = providers[provider.toUpperCase()].format,
    agencyID = providers[provider.toUpperCase()].agencyID;
  if (isInArray(provider, Object.keys(providers))) {
    var dataSet = "";
    if (provider !== "EUROSTAT" && provider !== "WEUROSTAT") {
      dataSet = req.params.dataset.toUpperCase();
    } else {
      dataSet = req.params.dataset;
    }

    // All keys to UpperCase
    var key,
      keys = Object.keys(req.query);
    var n = keys.length;
    var reqParams = {};
    while (n--) {
      key = keys[n];
      var kkey = key; // name of the key before it get changed below
      if (key.toUpperCase() === "FREQUENCY") {
        key = "FREQ";
      }
      if (key === "startPeriod") {
        reqParams[key] = req.query[key];
      } else if (key === "firstNObservations") {
        reqParams[key] = req.query[key];
      } else if (key === "lastNObservations") {
        reqParams[key] = req.query[key];
      } else if (key === "endPeriod") {
        reqParams[key] = req.query[key];
      } else {
        reqParams[key.toUpperCase()] = req.query[kkey];
      }
    }
    var dimRequested = ""; // string fill with ordered dimensions passed by the user in req.params
    if (provider === "WEUROSTAT") {
      var myPath =
        providers[provider].path +
        providers[provider].agencyID +
        "/data/" +
        dataSet;
    } else {
      var myPath = providers[provider].path + "data/" + dataSet;
    }
    logger("getDataset with provider: %s, dataset: %s", provider, dataSet);
    logger("getDataset with path=%s", myPath);
    getDim(provider, null, null, dataSet, function (err, dim) {
      if (err) {
        res.status(500).send(dim); // if err, dim is the errorMessage
      } else {
        var authParams = dim.arrDim; // Authorised dimensions for the dataset.
        var compt = 0;
        authParams.forEach(function (it, ind) {
          if (reqParams[it] != null) {
            if (ind < dim.nbDim - 1) {
              dimRequested += reqParams[it] + ".";
            } else {
              dimRequested += reqParams[it];
            }
            delete reqParams[it];
          } else {
            if (ind < dim.nbDim - 1) {
              dimRequested += ".";
            }
            compt++;
          }
        });
        // When the whole dataSet is requested.
        if (compt == dim.nbDim) {
          dimRequested = "all";
        }
        myPath += "/" + dimRequested;

        Object.keys(reqParams).forEach(function (it, ind, arr) {
          if (ind === 0) {
            myPath += "?";
          }
          myPath += it.toString() + "=" + reqParams[it];
          if (ind < arr.length - 1) {
            myPath += "&";
          }
        });
        var options = {
          url: protocol + "://" + host + myPath,
          headers: {
            connection: "keep-alive",
            accept:
              "application/vnd.sdmx.structurespecificdata+xml;version=2.1",
            "user-agent": "nodeJS",
          },
        };
        logger("auth params: %s", authParams);
        logger("dimensions: %s", dimRequested);

        var conn = rabbit.get(),
          id = shortid.generate();
        var task = {
          options: options,
          dataSet: dataSet,
          authParams: authParams,
          file: id,
        };
        rabbit.sendMessage(conn, JSON.stringify(task));
        res.send(buildHTML.bigDataset(id));
      }
    });
  } else {
    var errorMessage =
      "The provider " + provider + "is not supported by the application.";
    errorMessage =
      'List of supported providers is <a href="/providers">here</a>.';
    res.status(404).send(embedErrorMessage(errorMessage));
  }
}

// Send temporary file
export function getTemp(req, res) {
  var id = req.params.id;
  logger("Request for temporary file with id: %s", id);
  if (id.slice(-4) === "html") {
    // Being here means the file does not exist yet (or does
    // not exist anymore).
    // Send wait to the user
    res.send(buildHTML.wait(id));
  } else {
    // else let Rabbit send us the route
    rabbit.sendTempFile(id, function (route) {
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
