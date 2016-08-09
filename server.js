
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

var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    fetcher = require('./routes/fetcher'),
    cal = require('./routes/cal'),
    fetcher2 = require('./routes/fetcher2');
    // search = require('./routes/search');



var app = express();


var port = process.env.PORT || 8080;


app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use('/',express.static(__dirname + '/public/'));

// TimeSeries for Insee
app.get('/series/:series', fetcher.getSeries);
app.get('/dataset/:dataset', fetcher.getDataSet);
app.get('/datastructure/:dataset', fetcher.getDataStruc);
app.get('/dataflow',fetcher.getDataFlow);
app.get('/dataflow/:dataset', fetcher.getListIdBanks); // donne la liste des idbanks contenue dans un dataset
app.get('/codelist/:codelist', fetcher.getCodeList); // donne la liste des codes disponibles pour chaque dimension

// Timeseries for others providers
app.get('/:service/dataflow', fetcher2.getAllDataFlow);
app.get('/:service/dataflow/:dataset', fetcher2.getDataFlow);
app.get('/:service/dataset/:dataset',fetcher2.getDataSet);
app.get('/:service/series/:series',fetcher2.getSeries);
app.get('/:service/codelist/:codelist',fetcher2.getCodeList);

// Timeseries from sdmx url
app.get('/req',fetcher2.getDatafromURL);
app.post('/requestbyURL',fetcher2.redirectURL);
// app.get('/byURL', fetcher2.getFormforURL);

// Calendrier
app.get('/cal/:cals', cal.getCals);
app.get('/cal',cal.getFormCal);
app.post('/createCal',cal.sendCal);
app.post('/cal/createCal',cal.sendCal);

// Search Engine
// app.get('/search/all', search.getAllId);

// Jokes
app.get('/chuck',fetcher.getChuck);

app.listen(port, function() {
    console.log('Our app is running on port '+ port);
});


// Very dangerous
process.on('uncaughtException', (err) => {
     console.log(`Caught exception: ${err}`);
});
