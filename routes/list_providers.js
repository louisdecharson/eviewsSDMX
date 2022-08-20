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
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const providers = require("./providers.json");

// HTML
function htmlURL(provider) {
  return `
<strong>
  <center>
    <code>
      <span class="url">http://sdmx.herokuapp.com</span>
      /
      <span class="providercolor">${provider}</span>
      /
      <span class="resource">resource</span>
      /
      <span class="resource_id">resource_id</span>
    </code>
  </center>
</strong>
`;
}

export function getProviders(req, res) {
  let body = `
<!DOCTYPE html>
<html>
  <head>
    <title>SDMX in EViews</title>
    <link rel="stylesheet" href="/css/sdmx.css"></link>
  </head>
  <body>
    <span class="badge badge-pill badge-primary badge-home">
      <a href="/">Back</a>
    </span>
    <div class="listProviders">
      <h1 style="text-align:center;">Providers</h1>
      <h3>List of supported providers</h3>
      <hr/>
      <ul class="providers">
`;
  Object.keys(providers).forEach((provider) => {
    const providerName = providers[provider].name;
    let label = `${providerName}`;
    let content = `
<div class="content" id="${provider}">
  <h4>${providerName}</h4>
  <p class="key">
    Provider key:
    <span class="badge badge-pill badge-dark">${provider.toLowerCase()}</span>
`;
    if (providers[provider].native === "True") {
      label += '<span class="badge badge-pill badge-primary">native</span>';
      const link = `<a href="/${provider}/dataflow">${provider.toLowerCase()}</a>`;
      content += `
<h5>List datasets</h5>
<p>The list of available datasets is available at ${link}</p>
<h5>Get data</h5>
<div>
  <p>
    Url to retrieve data is:<br/> ${htmlURL(provider.toLowerCase())}<br/>
  </p>
  <strong class="resource">resource</strong>
  <ul style="margin-bottom: 5px;">
    <li><code>dataset</code>: for retreiving a dataset.</li>
    <li><code>series</code>: for retreiving a timeseries.</li>
  </ul>
  <strong class="resource_id">resource_id</strong> is the <strong>id</strong> of either the dataset or the timeseries.
`;
    } else if (provider === "OECD") {
      label +=
        '<span class="badge badge-pill badge-secondary">non-native</span>';
      const link = `<a href="/${provider}/dataflow">${provider.toLowerCase()}</a>`;
      content += `
<h5>List datasets</h5>
<p>The list of available datasets is available at ${link}</p>
<h5>Get data</h5>
<div>
  <p>
    Url to retrieve data is:<br/>
    <strong>
      <center>
        <code>
          <span class="url">http://sdmx.herokuapp.com</span>
          /
          <span class="providercolor">${provider}</span>
          /
          <span class="resource">dataset_id</span>
          /
          <span class="resource_id">resource_id</span>
        </code>
      </center>
    </strong>
  <br/>
  </p>
  <strong class="resource">dataset_id</strong> is the id of the dataset (like QNA)<br/>
  <strong class="resource_id">resource_id</strong> is the <strong>id</strong> of the series requested
  (e.g. concatenation of dimensions separated by a ".").
  To get multiple series, use multiple dimensions separated by a "+". Example: <code>AUS+AUT.B1_GE.VOBARSA.Q</code>
`;
    } else {
      label +=
        '<span class="badge badge-pill badge-secondary">non-native</span>';
      if (providers[provider].apiKey === "True") {
        content += `
<p>
  <span style="color:#da3749; font-weight: bold;">
    &#9888; An API key is required to access the data.
  </span>
<p/>
`;
      }
      content += `
<h5>List datasets</h5>
<p>Available data is listed on the providers website.</p>
<h5>Get data</h5>
<div>
  <p>Url to retrieve data is:
    <center>
      <strong>
        <code>
          <span class="url">http://sdmx.herokuapp.com/</span>
          <span class="providercolor">${provider.toLowerCase()}</span>
          /
          ${
            providers[provider].apiKey === "True"
              ? "<span class='resource'>api_key</span>/"
              : ""
          }
          <span class="resource_id">resource_id</span>
        </code>
      </strong>
    </center>
    <br/>
    <strong class="resource_id">resource_id</strong>: the id of the resource given by the provider.<br/>
`;
    }
    if (providers[provider].apiKey === "True") {
      label += '<span class="badge badge-pill badge-danger">apiKey</span>';
      const link = `<a href="${providers[provider].protocol}://${providers[provider].host}">website</a>`;
      content += `
        <strong class="resource">api_key</strong>: your API key. Find one on the provider ${link}`;
    }
    const title = `
<li class="provider">
  <input type='checkbox' style='display: none' checked=true id=${provider}>
  <label for=${provider}>${label}</label>`;
    body += `${title}${content}</div>`;
  });
  body += "</ul></div></body>";
  res.send(body);
}
