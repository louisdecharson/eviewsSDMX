// Copyright (C) 2018 Louis de Charsonville

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
import Debug from 'debug';
import * as resourceHTML from './resourceHTML.js';
import { createRequire } from 'module'

const logger = Debug('explore');
const require = createRequire(import.meta.url);
const providers = require('./providers.json');

// HTML


export function getProviders(req, res) {
    var body = '<body><span class="badge badge-pill badge-primary badge-home"><a href="/">Back</a></span><div class="listProviders"><h1 style="text-align:center;">Providers</h1><h3>List of supported providers</h3><hr/><ul class="providers">';
    Object.keys(providers).forEach(function(provider,index) {
        var title = '<li class="provider" data-toggle="collapse" data-target="#'+ provider + '">' + providers[provider].name,
            content = '<div class="collapse content" id="'+ provider + '">';
        content += '<h4>' + providers[provider].name + '</h4>';
        content += '<p class="key">Provider key:<span class="badge badge-pill badge-dark">'+ provider.toLowerCase() +'</span></p>';
        
        if (providers[provider].native === "True") {
            title += '<span class="badge badge-pill badge-primary">native</span>';
            content += '<h5>List datasets</h5><p>The list of available datasets is available at <a href="/' + provider + '/dataflow">/'+ provider.toLowerCase() + '/dataflow</a></p>';
            content += '<h5>Get data</h5><div>';
            content += '<p>Url to retrieve data is:<br/><strong><center><code><span class="url">http://sdmx.herokuapp.com/</span><span class="providercolor">'+ provider.toLowerCase()  +'</span>/<span class="resource">resource</span>/<span class="resource_id">resource_id</span></code></center></strong><br/>';
            content += '<strong class="resource">resource</strong><ul style="margin-bottom: 5px;"><li><code>dataset</code>: for retreiving a dataset.</li><li><code>series</code>: for retreiving a timeseries.</li></ul>';
            content += '<strong class="resource_id">resource_id</strong> is the <strong>id</strong> of either the dataset or the timeseries.';
        } else if (provider === "OECD") {
            title += '<span class="badge badge-pill badge-secondary">non-native</span>';
            content += '<h5>List datasets</h5><p>The list of available datasets is available at <a href="/' + provider + '/dataflow">/'+ provider.toLowerCase() + '/dataflow</a></p>';
            content += '<h5>Get data</h5><div>';
            content += '<p>Url to retrieve data is:<br/><strong><center><code><span class="url">http://sdmx.herokuapp.com/</span><span class="providercolor">'+ provider.toLowerCase()  +'</span>/<span class="resource">dataset_id</span>/<span class="resource_id">resource_id</span></code></center></strong><br/>';
            content += '<strong class="resource_id">resource_id</strong> is the <strong>id</strong> of either the dataset or the timeseries.';
        } else  {
            title += '<span class="badge badge-pill badge-secondary">non-native</span>';
            if (providers[provider].apiKey === "True") {
                content += '<p><span style="color:#da3749; font-weight: bold;">&#9888; An API key is required to access the data.</span><p/>';
            }
            content += '<h5>List datasets</h5><p>Available data is listed on the providers website.</p>';
            content += '<h5>Get data</h5><div>';
            content += '<p>Url to retrieve data is: <center><strong><code><span class="url">http://sdmx.herokuapp.com/</span><span class="providercolor">'+ provider.toLowerCase()  +'</span>/';
            if (providers[provider].apiKey === "True") {
                content += '<span class="resource">api_key</span>/';
            }
            content += '<span class="resource_id">resource_id</span></code></strong></center></br>';
            content += '<br/><strong class="resource_id">resource_id</strong>: the id of the resource given by the provider.</br>';
        }
        if (providers[provider].apiKey === "True") {
            title += '<span class="badge badge-pill badge-danger">apiKey</span>';
            content += '<strong class="resource">api_key</strong>: your API key. Find one on the provider <a href="'+ providers[provider].protocol + "://" + providers[provider].host + '">website</a>';
        }
        body += title + content + '</div>';
    });
    body += '</ul></div>';
    var html =  resourcesHTML.header + body + resourcesHTML.footer;
    res.send(html);
};
