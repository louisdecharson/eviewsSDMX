var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    fetcher = require('./routes/fetcher');


var app = express();

var port = process.env.PORT || 8080;


app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname + '/routes/index.html'));
});


app.get('/series/:series', fetcher.getSeries);
app.get('/dataset/:dataset', fetcher.getDataSet);
app.get('/datastructure/:dataset', fetcher.getDataStruc);
app.get('/dataflow',fetcher.getDataFlow);
app.get('/cal/:cals', fetcher.getCals);
app.get('/cal',fetcher.getFormCal);
app.post('/createCal',fetcher.sendCal);


app.listen(port, function() {
    console.log('Our app is running on port '+ port);
});


// Very dangerous
process.on('uncaughtException', (err) => {
     console.log(`Caught exception: ${err}`);
});
