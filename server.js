var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    fetcher = require('./routes/fetcher'),
    cal = require('./routes/cal'),
    search = require('./routes/search');



var app = express();

var port = process.env.PORT || 8080;


app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname + '/routes/index.html'));
});

// TimeSeries
app.get('/series/:series', fetcher.getSeries);
app.get('/dataset/:dataset', fetcher.getDataSet);
app.get('/datastructure/:dataset', fetcher.getDataStruc);
app.get('/dataflow',fetcher.getDataFlow);
app.get('/dataflow/:dataset', fetcher.getListIdBanks); // donne la liste des idbanks contenue dans un dataset

// Calendrier
app.get('/cal/:cals', cal.getCals);
app.get('/cal',cal.getFormCal);
app.post('/createCal',cal.sendCal);
app.post('/cal/createCal',cal.sendCal);

// Search Engine
app.get('/search/all', search.getAllId);


app.listen(port, function() {
    console.log('Our app is running on port '+ port);
});


// Very dangerous
process.on('uncaughtException', (err) => {
     console.log(`Caught exception: ${err}`);
});
