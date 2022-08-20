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

const sdmxCSS = '<link rel="stylesheet" href="/css/sdmx.css"></link>';
const APP_TITLE =
  '<h1>SDMX in EViews</h1><p><i>Import data in EViews</i></p><a class="btn btn-sm btn-primary" href="/">More details</a><hr/>';

/**
 * Returns the html code for a table cell (td)
 * @param {string} content - content of the cell
 * @param {boolean} [center=true] - whether the content of the cell should be centered
 * @param {string} [cssClass=""] - class for table cell
 * @returns {string} html code for a table cell
 */
export function htmlCell(content, center = true, cssClass = "") {
  const style = center ? ' style="text-align: center;"' : "";
  return `<td class="${cssClass}"${style}>${content}</td>`;
}

/**
 * Returns the html code for a table
 * @param {string} tableHeader
 * @param {string} tableBody
 * @param {string} [secondHeader]
 * @param {string} [cssClass=table]
 */
export function htmlTable(
  tableHeader,
  tableBody,
  secondHeader = null,
  cssClass = "table"
) {
  let header = `<tr>${tableHeader}</tr>`;
  if (secondHeader != null) {
    header += `<tr>${secondHeader}</tr>`;
  }
  const table = `
<table class="${cssClass}">
  <thead>${header}</thead>
  <tbody class="list">${tableBody}</tbody>
</table>`;
  return table;
}

/**
 * Encapsulates a html body into an html document with
 * a header a body
 * @param {string} title
 * @param {string} body
 * @param {string} css
 * @param {string} js
 */
export function htmlPage(title, body, js = "", css = "") {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    ${css}
  </head>
  <body>
  ${APP_TITLE}
  ${body}
  ${js}${sdmxCSS}
  </body>
</html>`;
}

export function error404() {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>SDMX in EViews - Error 404</title>
    <style>
      body {
        background-color: black;
        color: white;
        text-align: center;
        margin-top: 20%;
        width: 100%;
        font-family: Menlo;
        text-align: center;
      }
      p {
        font-size: 100px;
    }
    </style>
  </head>
  <body>
    <p>404</p>
  </body>
</html>
`;
}
