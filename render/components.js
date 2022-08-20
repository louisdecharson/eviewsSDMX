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
 * Returns the html code for a cell
 * @param {string} content - content of the cell
 * @param {boolean} [center=true] - whether the content of the cell should be centered
 */
export function htmlCell(content, center = true) {
  if (center) {
    return `<td style="text-align: center;">${content}</td>`;
  }
  return `<td>${content}</td>`;
}

/**
 * Returns the html code for a table
 * @param {string} tableHeader
 * @param {string} tableBody
 * @param {string} [secondHeader]
 */
export function htmlTable(tableHeader, tableBody, secondHeader = null) {
  let header = `<tr>${tableHeader}</tr>`;
  if (secondHeader != null) {
    header += `<tr>${secondHeader}</tr>`;
  }
  const table = `
<table class="table">
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
