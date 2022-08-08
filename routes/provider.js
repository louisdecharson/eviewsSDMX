import { parseString } from "xml2js";
import { createRequire } from "module";
import Debug from "debug";
import { handleRequest } from "./request.js";
import { parserError } from "./errors.js";
import { stripPrefix } from "../helpers.js";

const require = createRequire(import.meta.url);
const providers = require("./providers.json");

const logger = Debug("fetcher");

const PROVIDERS = new Set(Object.keys(providers));
const XML_PARSER_OPTIONS = {
  tagNameProcessors: [stripPrefix],
  mergeAttrs: true,
};

export class Context {
  /**
   * Stores information to about the request
   * @param {string} provider
   * @param {string} resource
   */
  constructor(provider, resource) {
    this.provider = provider;
    this.resource = resource;
  }
}

export class Provider {
  /**
   * Creates a provider instance
   * @param {string} provider - The provider name
   */
  constructor(provider) {
    this.provider = provider;
    this.providerKey = provider.toUpperCase();
    this.agencyID = providers[this.providerKey].agencyID;
    this.protocol = providers[this.providerKey].protocol;
    this.host = providers[this.providerKey].host;
    this.format = providers[this.providerKey].format;
    this.nodata = providers[this.providerKey].nodata;
    this.path = providers[this.providerKey].path;
  }

  static isKnown(provider) {
    return PROVIDERS.has(provider) || PROVIDERS.has(provider.toUpperCase());
  }

  get metadataPath() {
    if ("metadataPath" in providers[this.providerKey]) {
      return providers[this.providerKey].metadataPath;
    }
    return providers[this.providerKey].path;
  }

  /**
   * Retrieves the url for retrieving the agency
   * @param {string} dataset
   */
  getAgencyUrl(dataset) {
    return `${this.protocol}://${this.host}${this.metadataPath}dataflow/${this.agencyID}/${dataset}?${this.format}`;
  }

  /**
   * Retrieves the agency ID for a dataset
   * @param {string} dataset - dataset
   * @param {object} - agency and dsdId
   */
  getAgency(dataset, callback) {
    const context = new Context(this.provider, "agency");
    const url = this.getAgencyUrl(dataset);
    const contentType = "application/vnd.sdmx.structure+xml; version=2.1";
    handleRequest(url, contentType, context).then(({ requestErr, content }) => {
      if (requestErr) {
        callback(requestErr, null);
      } else {
        parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
          if (xmlParserErr === null) {
            try {
              const data =
                obj.Structure.Structures[0].Dataflows[0].Dataflow[0]
                  .Structure[0].Ref[0];
              const returnObj = {
                agency: data.agencyID[0],
                dsdId: data.id[0],
              };
              callback(null, returnObj);
            } catch (parserErr) {
              callback(parserError(this.provider, "agency", url), null);
            }
          } else {
            callback(parserError(this.provider, "agency", url), null);
          }
        });
      }
    });
  }

  /**
   * Retrieves the url to retrieve the dimension for a dataset id
   * @param {string} agency - agency id for the datastructure
   * @param {string} datastructure - datastructure id
   * @return {string} the url to retrieve dimension
   */
  getDimensionUrl(agency, datastructure) {
    return `${this.protocol}://${this.host}${this.metadataPath}datastructure/${agency}/${datastructure}?${this.format}`;
  }

  /**
   * Retrieves the dimension for a datastructure and dataset
   * @param {string} agency - agency id for the datastructure
   * @param {string} datastructure - datastructure id
   * @param {string} dataset - dataset name
   * @param {callback} callback - callback with two args: is_error, body
   */
  getDimension(agency, datastructure, dataset, callback) {
    if (agency === null && datastructure === null && dataset !== null) {
      this.getAgency(dataset, (error, agencyInfo) => {
        if (error) {
          callback(error, null);
        } else {
          this._getDimension(
            agencyInfo.agency,
            agencyInfo.dsdId,
            dataset,
            callback
          );
        }
      });
    } else if (agency === null && dataset === null) {
      callback("No agency nor dataset provided", null);
    } else {
      this._getDimension(agency, datastructure, dataset, callback);
    }
  }

  /**
   * Internal method to retrieve the dimension for a datastructure and dataset
   * @param {string} agency - agency id for the datastructure
   * @param {string} datastructure - datastructure id
   * @param {string} dataset - dataset name
   * @param {callback} callback - callback with two args: is_error, body
   */
  _getDimension(agency, datastructure, dataset, callback) {
    const context = new Context(this.provider, "dimension");
    const url = this.getDimensionUrl(agency, datastructure);
    const contentType = "application/vnd.sdmx.structure+xml; version=2.1";
    handleRequest(url, contentType, context).then(({ requestErr, content }) => {
      if (requestErr) {
        callback(requestErr, null);
      } else {
        parseString(content, XML_PARSER_OPTIONS, (parserErr, obj) => {
          if (parserErr === null) {
            try {
              const data =
                obj["Structure"]["Structures"][0]["DataStructures"][0][
                  "DataStructure"
                ][0]["DataStructureComponents"][0]["DimensionList"][0][
                  "Dimension"
                ];
              const nbDim = data.length;
              const arrDim = [];
              data.forEach((item, index) => {
                arrDim.push(item["id"][0]);
              });
              logger(
                "nbDim: %s ; arrDim: %s, dsdId: %s",
                nbDim,
                arrDim,
                datastructure
              );
              callback(null, {
                nbDim,
                arrDim,
                data,
                dsdId: datastructure,
              });
            } catch (error) {
              logger(error);
              callback(
                parserError(this.provider, "dataset dimensions", url),
                null
              );
            }
          } else {
            callback(
              parserError(this.provider, "dataset dimensions", url),
              null
            );
            logger(parserErr);
          }
        });
      }
    });
  }

  /**
   * Returns url to get all datasets
   * @returns {string} the url to fetch
   */
  getAllDataflowUrl() {
    return `${this.protocol}://${this.host}${this.path}dataflow/${this.agencyID}?${this.format}`;
  }

  /**
   * Returns url to get dataflow
   * @param {string} dataset - dataset name
   * @returns {string} the url to fetch
   */
  getDataflowUrl(dataset) {
    const prefix = `${this.protocol}://${this.host}${this.path}data/${dataset}`;
    if (this.nodata === "True") {
      return `${prefix}?detail=nodata&${this.format}`;
    }
    return `${prefix}?${this.format}`;
  }

  /**
   * Return url to get dataset
   * @param {string} dataset - dataset name
   * @param {string} query - query for a subset of dimensions
   * @param {string} params - parameters like startPeriod
   */
  getDatasetUrl(dataset, query, params) {
    return `${this.protocol}://${this.host}${this.path}data/${dataset}/${query}${params}`;
  }

  /**
   * Return url to get series
   * @param {string} series
   * @param {string} params - parameters like startPeriod
   * @param {string} dataset
   */
  getSeriesUrl(series, params, dataset = null) {
    if (this.providerKey === "INSEE") {
      return `${this.protocol}://${this.host}/series/sdmx/data/SERIES_BDM/${series}${params}`;
    }
    return `${this.protocol}://${this.host}${this.path}/data/${dataset}/${series}${params}`;
  }

  getSeriesAndDataset(seriesRaw) {
    if (this.providerKey === "INSEE") {
      return { series: seriesRaw, dataset: null };
    }
    const tmp = seriesRaw.split(".");
    const dataset = tmp[0];
    tmp.shit();
    const series = tmp.join(".");
    return { series, dataset };
  }

  /**
   * Return url to retrieve codelist
   * @param {string} codelist
   * @param {string} dsdId
   * @returns {string} url to retrieve codelist
   */
  getCodelistUrl(codelist, dsdId) {
    const prefix = `${this.protocol}://${this.host}${this.metadataPath}`;
    if (this.providerKey === "EUROSTAT") {
      return `${prefix}datastructure/${this.agencyID}/${dsdId}?${this.format}`;
    }
    return `${prefix}codelist/${this.agencyID}/${codelist}?${this.format}`;
  }
}
