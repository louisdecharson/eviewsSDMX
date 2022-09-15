import got from "got";
import Debug from "debug";
import { timeoutError, fetcherError, requestError } from "./errors.js";

const logger = Debug("request");

/**
 * Makes html request to url with content-type
 * @param {string} url
 * @param {string} content-type for GET request's headers
 * @param {Context} request's context
 * @param {boolean} [true] htmlError - if true then errors will be html
 * @param {number} [29500] timeout - timeout in ms
 * @param {object} [{}] agentOptions - agent options
 */
export async function handleRequest(
  url,
  contentType,
  context,
  htmlError = true,
  timeout = 29500,
  agent = {}
) {
  logger(`Request to url ${url}`);
  const options = {
    method: "GET",
    headers: {
      connection: "keep-alive",
      accept: contentType,
      "user-agent": "nodeJS",
    },
    timeout: {
      request: timeout,
    },
    agent,
    https: {
      rejectUnauthorized: false,
    },
  };
  try {
    const response = await got(url, options);
    if (response.statusCode >= 200 && response.statusCode < 400) {
      return { error: null, content: response.body };
    }
    logger(`Request error. code: ${response.statusCode}. url: ${url}`);
    if (htmlError) {
      return {
        error: fetcherError(
          context.provider,
          response.statusCode,
          context.resource,
          url
        ),
        content: null,
      };
    }
    return { error: response, content: null };
  } catch (error) {
    logger(`Request error: ${error}`);
    if (htmlError) {
      if (error.code === "ETIMEDOUT") {
        logger(`Timeout error. url: ${url}`);
        return {
          error: timeoutError(context.provider, context.resource, url),
          content: null,
        };
      }
      logger(`Request error. code: ${error.code}. url: ${url}.`);
      return {
        error: requestError(
          context.provider,
          error.code,
          context.resource,
          url
        ),
        content: null,
      };
    }
    return { error, content: null };
  }
}
