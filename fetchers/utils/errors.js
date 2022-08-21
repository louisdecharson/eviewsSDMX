import { htmlPage } from "../../render/components.js";

export function standardError(msg) {
  const title = "SDMX in EViews - Error";
  const body = `
<div class="alert alert-danger">
  ${msg}
</div>
`;
  return htmlPage(title, body);
}

export function fetcherError(provider, code, data, url, message) {
  const title = "SDMX in EViews - Error";
  let body = '<div class="alert alert-danger" role="alert">';
  let errorCauses;
  if (code >= 300 && code < 500) {
    errorCauses = `
<li>The data you are trying to download does not exist.</li>
<li>The filters or dimensions you have entered are incorrect.</li>
<li>${url} has changed and data is no longer accessible at this address.</li>
      `;
  } else {
    errorCauses = `
<li>${provider} servers are not working right now.</li>
    `;
  }
  body += `
<h4 class="alert-heading">Fetcher error</h4><hr/>
<p>Request to ${provider} failed with code ${code}.<br/>
We've tried to retrieve ${data} at <a href="${url}">${url}</a>
but got the following error message from ${provider}'s servers: </br>
<i>${message}</i>
<br/><hr/><h6>Possible causes:</h6>
<ul>${errorCauses}</ul></div>
  `;
  return htmlPage(title, body);
}

/**
 * Returns HTML formatted message for timeout errors.
 * @param {string} provider
 * @param {string} data
 * @param {string} url
 */
export function timeoutError(provider, data, url) {
  const title = "SDMX in EViews - Error";
  const body = `
<div class="alert alert-danger">
<h4 class="alert-heading">Timeout error</h4><hr/>
<p>Request to ${provider} timed out.<br/>
We have tried to retrieve ${data} at <a href="${url}">${url}</a>
but ${provider} servers were too long to respond and we had to stop the request.<br/>
<hr/><h6>Possible causes:</h6> <ul>
<li>${provider} servers are too busy. Try again later.</li></ul></div>
  `;
  return htmlPage(title, body);
}

/**
 * Returns HTML formatted message for parser errors.
 * @param {string} provider
 * @param {string} data
 * @param {string} url
 */
export function parserError(provider, data, url) {
  const title = "SDMX in EViews - Error";
  const body = `
<div class="alert alert-danger">
<h4 class="alert-heading">Parser error</h4><hr/>
<p>We successfully obtained data from ${provider} servers but we are not able to
decipher the answer. The error occured when retrieving ${data} at <a href="${url}">${url}</a>.<br/>
<hr/><h6>Possible causes:</h6><ul>
<li>Error might be on our side if our parser is not up-to-date. Raise an issue on
<a href="https://github.com/dgei-sdmx/eviewsSDMX/issues">Github project page</a>.</li></ul></div>
  `;
  return htmlPage(title, body);
}

/**
 * Returns HTML formatted message for request errors.
 * @param {string} provider
 * @param {string} code
 * @param {string} data
 * @param {string} url
 */
export function requestError(provider, code, data, url) {
  const title = "SDMX in EViews - Error";
  const body = `
<div class="alert alert-danger">
<h4 class="alert-heading">Request error</h4><hr/>
<p>We were unable to make a request to ${provider} servers. Request failed with code ${code}.<br/>
Request was tried with url <a href="${url}">${url}</a> while retrieving ${data}.<br/>
<hr/><h6>Possible causes:</h6> <ul>
<li>Error is on our side. Our parser is not up-to-date.
Raise an issue on <a href="https://github.com/dgei-sdmx/eviewsSDMX/issues">
Github project page</a>.</li></ul></div>
  `;
  return htmlPage(title, body);
}

export function unknownProviderError(provider) {
  const title = "SDMX in EViews - Error";
  const body = `
<div class="alert alert-danger">
<h4 class="alert-heading">Provider unknown error</h4><hr/>
<p>Provider ${provider} is unknown.</p></div>
  `;
  return htmlPage(title, body);
}
