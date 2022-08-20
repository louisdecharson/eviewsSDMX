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
import { htmlCell, htmlTable, htmlPage } from "./components.js";

// CONSTANTS
const listJS =
  '<script src="//cdnjs.cloudflare.com/ajax/libs/list.js/1.2.0/list.min.js"></script>';

/**
 * Removes the "CL_" of the codelist dimension name
 * @param {string} str
 */
function sliceCL(str) {
  if (str.substring(0, 3) === "CL_") {
    return str.slice(3);
  }
  return str;
}

/**
 * Looks for a key in dict matching pattern and return associated value
 * @param {object} dict
 * @param {string} pattern
 */
function getValueForKeyMatchingPattern(dict, pattern) {
  const keys = Object.keys(dict);
  let indexMatchingKey = -1;
  let k = 0;
  while (k < keys.length && indexMatchingKey === -1) {
    indexMatchingKey = keys[k].indexOf(pattern);
    k += 1;
  }
  if (indexMatchingKey > -1) {
    return dict[keys[k - 1]][0];
  }
  return null;
}

export function dataFlow(data, service) {
  const title = "SDMX API for EViews / DATAFLOWS ";
  const jsForSearch = `${listJS}<script>var options = {valueNames: ['name', 'desc'], searchClass: 'form-control'}; var dataList = new List('myDataflows',options);</script>`;
  const tableHeader = "<th>Id</th><th>Description</th>";
  let tableBody = "";
  data.forEach((item) => {
    const [dataset, , , description, provider] = item;
    const link = `<a href"/${provider}/dataflow/${dataset}">${dataset}</a>`;
    tableBody += `<tr>${htmlCell(link, false, "name")}`;
    tableBody += `${htmlCell(description, false, "desc")}</tr>`;
  });
  const table = htmlTable(tableHeader, tableBody, "", "table w100");
  const body = `
    <h2>List of all the datasets of ${service.toUpperCase()}</h2>
    <div id="myDataflows">
      <input class="form-control" placeholder="Search"><br>
      ${table}
    </div>
  `;
  return htmlPage(title, body, jsForSearch);
}

/**
 * Returns an array of dates contained in timeseries
 * @param {object} timeseries - object containing the timeseries data
 * @returns {Array.<string>} sorted array of dates
 */
function getSortedDates(timeseries) {
  let dates = [];
  timeseries.forEach((item) => {
    item.Obs.forEach((it) => {
      dates.push(it.TIME_PERIOD[0]);
    });
  });
  // Delete duplicates in vObs:
  dates = [...new Set(dates)];
  // We return a chronological vector of observations:
  return dates.sort(
    (a, b) =>
      parseInt(a.match(/\d/g).join(""), 10) -
      parseInt(b.match(/\d/g).join(""), 10)
  );
}
/**
 * Sanitize date (e.g. replace hyphen, replace characters)
 * @param {string} date - date as a string
 */
function sanitizeDate(date) {
  return date.replace("-Q", "Q").replace("-S", "S").replace("-B", "S");
}

/**
 * Construct series id out of dataset and dimension: dataset.dimension_1.dimension_2 etc
 * @param {object} series - the series data
 * @param {string} dataset - the dataset name
 * @param {Array<String>} dimensions - the list of dimensions name for that dataset
 * @returns {string} the series id
 */
function buildSeriesId(series, dataset, dimensions) {
  let title = dataset;
  if (dimensions.length > 0) {
    title += `.${dimensions.map((x) => series[x][0]).join(".")}`;
  }
  return title;
}

export function makeTable(timeseries, dataset, dimensions) {
  const title = `SDMX for EViews / ${dataset}`;
  let mainTableHeader = "<th>Dates</th>";
  let descriptionTableHeader = "<th>&nbsp;</th>";
  let tableBody = "";
  const cursors = new Array(timeseries.length).fill(0); // array of cursors
  const observations = [];
  const dates = getSortedDates(timeseries);
  let timeseriesSorted;
  let isReverse;
  let nbObs;
  if (timeseries[0].Obs !== undefined) {
    timeseriesSorted = timeseries.sort((a, b) => b.Obs.length - a.Obs.length); // vector of timeseries
    nbObs = dates.length;
    // Check if timeseries are in reverse position :
    isReverse = false;
    if (timeseriesSorted[0].Obs.length > 1) {
      const dateFirst = parseInt(
        timeseriesSorted[0].Obs[0].TIME_PERIOD[0].match(/\d/g).join(""),
        10
      );
      const dateLast = parseInt(
        timeseriesSorted[0].Obs[1].TIME_PERIOD[0].match(/\d/g).join(""),
        10
      );
      isReverse = dateFirst > dateLast;
    }
  } else {
    timeseriesSorted = timeseries;
    nbObs = 0;
    isReverse = false;
  }
  // Build header
  timeseriesSorted.forEach((series) => {
    // Get series id for main header
    let seriesId = getValueForKeyMatchingPattern(series, "ID");
    if (seriesId == null) {
      seriesId = buildSeriesId(series, dataset, dimensions);
    }
    mainTableHeader += `<th>${seriesId}</th>`;
    // Get series description
    let seriesDescription = getValueForKeyMatchingPattern(series, "TITLE");
    if (seriesDescription == null) {
      seriesDescription = getValueForKeyMatchingPattern(series, "NAME");
    }
    if (seriesDescription == null) {
      seriesDescription = "&nbsp;";
    }
    descriptionTableHeader += `<th>${seriesDescription}</th>`;
    // REVERSE THE TIMESERIES TO GET DATE IT THE ASCENDING ORDER
    if (isReverse && nbObs > 0) {
      observations.push(series.Obs.reverse()); // sorted vector of timeseries
    } else {
      observations.push(series.Obs);
    }
  });
  // BODY
  let i = 0;
  while (i < nbObs) {
    tableBody += "<tr>";
    tableBody += htmlCell(sanitizeDate(dates[i]), false);
    for (let k = 0; k < observations.length; k += 1) {
      if (cursors[k] < observations[k].length) {
        if (dates[i] === observations[k][cursors[k]].TIME_PERIOD[0]) {
          tableBody += htmlCell(observations[k][cursors[k]].OBS_VALUE[0]);
          cursors[k] += 1;
        } else {
          tableBody += htmlCell("");
        }
      } else {
        tableBody += htmlCell("");
      }
    }
    tableBody += "</tr>";
    i += 1;
  }
  const body = htmlTable(mainTableHeader, tableBody, descriptionTableHeader);
  return htmlPage(title, body);
}
function getHTMLButton(url, text) {
  return `<a href="${url}" class="btn btn-primary" role="button">${text}</a>`;
}

export function detailDataset(
  provider,
  timeseries,
  dataset,
  dim,
  errorDatasetTooBig,
  displaySeriesProvidedId = true
) {
  const title = `SDMX API for EViews / ${dataset}`;
  const css =
    "<style display:none>body {padding-left: 10px; padding-right:10px;}</style>";
  const jsforList =
    "<script>var options = {valueNames: ['name', 'id'], searchClass: 'form-control'}; var dataList = new List('myTS',options);</script>";

  let body = `<h2>Dataset ${dataset}</h2><hr>`;
  // Add a button
  body += getHTMLButton(
    `http://sdmx.herokuapp.com/${provider}/dataset/${dataset}`,
    "Download"
  );
  body += "<h3> 1. Dimensions of the data </h3>";
  body += `Dataset has ${dim.nbDim} dimensions (click on a dimension to see its available values)`;
  body += "<ul>";
  dim.data.forEach((it) => {
    const dimensionCode = it.LocalRepresentation[0].Enumeration[0].Ref[0].id[0];
    const dimensionName = it.id[0];
    body += `<li><a href=/${provider}/codelist/${dimensionCode}?dsdId=${dim.dsdId}>${dimensionName}</a></li>`;
  });
  body += "</ul>";
  body += "<h3> 2. List of the timeseries contained in the dataset</h3>";
  const searchBar =
    '<div id="myTS"><strong>Search: </strong><input class="form-control" placeholder="Search"><br>';

  const theader = "<th>Series Id</th><th>Title</th><th>Last update</th>";
  let tableBody = "";
  let error = "<p hidden></p>";
  let tableDef = '<table class="table w100">';
  if (errorDatasetTooBig == null) {
    timeseries.forEach((series) => {
      let seriesId = buildSeriesId(series, dataset, dim.arrDim);
      let seriesProviderId = seriesId;
      if (provider.toUpperCase() === "INSEE") {
        seriesProviderId = getValueForKeyMatchingPattern(series, "ID");
        if (displaySeriesProvidedId) {
          seriesId = seriesProviderId;
        }
      }
      tableBody += `<tr><td class="id"><a href="/${provider}/series/${seriesProviderId}">${seriesId}</a></td>`;
      let seriesDescription = getValueForKeyMatchingPattern(series, "TITLE");
      if (seriesDescription == null) {
        seriesDescription = getValueForKeyMatchingPattern(series, "NAME");
      }
      if (seriesDescription == null) {
        seriesDescription = "&nbsp;";
      }
      tableBody += `<td class="name">${seriesDescription}</td>`;
      let seriesLastUpdate;
      if (series.LAST_UPDATE != null) {
        [seriesLastUpdate] = series.LAST_UPDATE;
      } else {
        seriesLastUpdate = "&nbsp;";
      }
      tableBody += `<td>${seriesLastUpdate}</td></tr>`;
    });
  } else {
    error = `<p>ERROR : The app cannot display timeseries because ${errorDatasetTooBig}</p>`;
    tableDef = "<table hidden>";
  }
  const table = `<thead><tr>${theader}</tr></thead><tbody class="list">${tableBody}</tbody>`;
  body += error + searchBar + tableDef + table;
  return htmlPage(title, body, jsforList, css);
}

export function codeList(codes, dimTitleRaw) {
  const dimensionTitle = sliceCL(dimTitleRaw);
  const title = `SDMX API for EViews / Codelist for ${dimensionTitle}`;
  const css = "<style display:none>body {padding-left: 10px;}</style>";
  let body = `<h6>List of codes potentially available for the dimension ${dimensionTitle}</h6><br/>`;
  const tableHeader = "<th>Id</th><th>Description</th>";
  let tableBody = "";
  codes.forEach((code) => {
    const codeName = code.Name[code.Name.length - 1]["_"];
    tableBody += `<tr><td style="min-width:50px">${code.id[0]}</td>`;
    tableBody += `<td style="min-width:100px">${codeName}</td></tr>`;
  });
  const table = htmlTable(tableHeader, tableBody);
  body += table;
  return htmlPage(title, body, "", css);
}

export function makeTableOECD(timeseries, seriesName, dataset) {
  const title = `SDMX API for EViews / OECD / ${seriesName}"`;
  let mainTableHeader = "<th>Dates</th>";
  const descriptionTableHeader = "<th>&nbsp;</th>";
  let tableBody = "";
  const cursors = new Array(timeseries.length).fill(0); // array of cursors
  const observations = [];
  let timeseriesSorted;
  let isReverse;
  let nbObs;

  if (timeseries[0].Obs !== undefined) {
    timeseriesSorted = timeseries.sort((a, b) => b.Obs.length - a.Obs.length); // vector of timeseries
    nbObs = timeseriesSorted[0].Obs.length;
    // Check if timeseries are in reverse position :
    isReverse = false;
    if (timeseriesSorted[0].Obs.length > 1) {
      const dateFirst = timeseriesSorted[0].Obs[0].Time[0];
      const dateLast = timeseriesSorted[0].Obs[1].Time[0];
      if (dateFirst.substring(0, 4) > dateLast.substring(0, 4)) {
        isReverse = true;
      } else if (dateFirst.slice(-1) > dateLast.slice(-1)) {
        isReverse = true;
      }
    }
  } else {
    timeseriesSorted = timeseries;
    nbObs = 0;
    isReverse = false;
  }
  // HEADER
  timeseriesSorted.forEach((series) => {
    const dimensionsIdSuffix = series.SeriesKey[0].Value.map(
      (x) => x.value[0]
    ).join(".");
    const seriesId = `${dataset}.${dimensionsIdSuffix}`;
    mainTableHeader += `<th>${seriesId}</th>`;
    // REVERSE THE TIMESERIES TO GET DATE IT THE ASCENDING ORDER
    if (isReverse && nbObs > 0) {
      observations.push(series.Obs.reverse()); // sorted vector of timeseries
    } else {
      observations.push(series.Obs);
    }
  });
  let i = 0;
  while (i < nbObs) {
    tableBody += "<tr>";
    tableBody += htmlCell(sanitizeDate(observations[0][i].Time[0]), false);
    for (let k = 0; k < observations.length; k += 1) {
      if (cursors[k] < observations[k].length) {
        if (
          observations[0][i].Time[0] === observations[k][cursors[k]].Time[0]
        ) {
          tableBody += htmlCell(observations[k][cursors[k]].ObsValue[0].value);
          cursors[k] += 1;
        } else {
          tableBody += htmlCell("");
        }
      } else {
        tableBody += htmlCell("");
      }
    }
    tableBody += "</tr>";
    i += 1;
  }
  const body = htmlTable(mainTableHeader, tableBody, descriptionTableHeader);
  return htmlPage(title, body);
}

/**
 * Creates an HTML page containing data (for Bundesbank data)
 * @param {object} data - object containing the data to be displayed
 * @param {callable} callback - callback function
 */
export function makeTableBuba(data, callback) {
  const seriesID = data[0].value;
  const title = `SDMX in EViews / Deutsche Bundesbank / ${seriesID}`;
  let tableBody = "";
  let tableHeader = `<tr><th>Dates</th><th>${seriesID}</th></tr>`;
  tableHeader += `<tr><th></th><th>${data[1].value}</th></tr>`;
  data.forEach((it, ind) => {
    if (ind > 6) {
      tableBody += "<tr>";
      tableBody += htmlCell(sanitizeDate(it.date), false);
      tableBody += htmlCell(it.value, true);
      tableBody += "</tr>";
    }
  });
  const table = htmlTable(tableHeader, tableBody);
  callback(htmlPage(title, table));
}

export function makeTableFred(data, seriesName) {
  const title = `SDMX in EViews / FRED / ${seriesName}`;
  let body = "<h4> FRED for EViews API</h4>";
  const tableHeader = `<th>Dates</th><th>${seriesName}</th>`;
  let tableBody = "";
  data.forEach((it) => {
    tableBody += `<tr>${htmlCell(it.date, false)}${htmlCell(it.value)}</tr>`;
  });
  const table = htmlTable(tableHeader, tableBody);
  body += table;
  return htmlPage(title, body);
}

export function makeTableBLS(series) {
  const { data } = series;
  const title = `SDMX in EViews / FRED / ${series.seriesID}`;
  let body = `<h4> Bureau of Labor Statistics - ${series.seriesID}</h4>`;
  const tableHeader = `<th>Dates</th><th>${series.seriesID}</th>`;
  let tableBody = "";
  data.forEach((it) => {
    tableBody += `<tr>${htmlCell(it.year + it.period, false)}`;
    tableBody += `${htmlCell(it.value)}</tr>`;
  });
  const table = htmlTable(tableHeader, tableBody);
  body += table;
  return htmlPage(title, body);
}

export function OECDDimensions(dim, nameDataset) {
  const title = `SDMX API for EViews / OECD / ${nameDataset}`;
  let body = `<h1>Dataset ${nameDataset}</h1><hr>`;
  body += "<h3>Dimensions of the data </h3>";
  body += `<p>Dataset has ${dim.length} dimensions `;
  body += "(click on a dimension to see its available values):<ul>";
  dim.forEach((it) => {
    body += `<li><a href=/oecd/codelist/${it.conceptRef}?Dataset=${nameDataset}>${it.conceptRef}</a></li>`;
  });
  body += "</ul>";
  body +=
    '<hr><div class="alert alert-primary" role="alert"><h4>Build a request</h4>';
  body +=
    '<p>Request for OECD data has the form: <code>/oecd/dataset_code/Dimensions_separated_by_dots</code>.<br/>Note that <ul><li>multiple dimensions can be selected by separated them by a "+".</li><li>Order of dimensions in the URL <strong>do matter</strong>.</li></ul> <br/><strong>Example</strong>: <br/><code>http://sdmx.herokuapp.com/oecd/QNA/AUS+AUT.B1_GE.VOBARSA.Q</code></p></div>';
  return htmlPage(title, body);
}

export function OECDCodeList(codes, dimension, nameDataset) {
  const title = `SDMX API for EViews / OECD / ${nameDataset} - {codeList}`;
  let body = `<h4>Available values for dimension ${dimension} in dataset ${nameDataset}</h4><hr>`;
  let tableBody = "";
  const tableHeader = "<th>Code</th><th>Description</th>";
  const jsforList =
    "<script>var options = {valueNames: ['code', 'desc'], searchClass: 'form-control'}; var dataList = new List('myCodesList',options);</script>";

  body += '<div id="myCodesList">';
  body += '<input class="form-control" placeholder="Search"><br>';
  codes.Code.forEach((i) => {
    tableBody += `<tr>${htmlCell(i.value, false, "code")}`;
    tableBody += `${htmlCell(i.Description[0]["_"], false, "desc")}</tr>`;
  });
  const table = htmlTable(tableHeader, tableBody);
  body += table;
  return htmlPage(title, body, jsforList);
}

// Function to send when a big dataset has been requested
export function bigDataset(url) {
  const body = `
     <div class="alert alert-primary">Wait... You have asked to download a big dataset. Your dataset is going to be available for download in a few minutes <a href="/temp/${url}">here</a>.</div>
    <div class="alert alert-danger" role="alert">
    <strong>Important to notice:</strong>
    This file will only be accessible once. Once downloaded, it will be deleted from our servers. Save it locally.
    </div>
`;
  return htmlPage("Big dataset", body);
}
// Function to display an error when a big dataset request has failed
export function bigDatasetError(error) {
  const title = "Big dataset - Error";
  const body = `
<div class="alert alert-danger">
  Your request has not been processed.
  <br/>
  Error: ${error}
</div>
`;
  return htmlPage(title, body);
}

// Function to send when the file is not yet available but requested by user.
export function bigDatasetWait() {
  const title = "Big dataset - Wait";
  const body = `
<div class="alert alert-warning">
  <strong>
    The requested file is not available.
  </strong>
  If you have just made the request, come back in a few minutes.
</div>
`;
  return htmlPage(title, body);
}
