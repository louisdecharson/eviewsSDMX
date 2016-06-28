var express = require('express'),
    path = require('path'),
    fetcher = require('./routes/fetcher');


var app = express();

var port = process.env.PORT || 8080;

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname + '/routes/index.html'));
});

app.get('/series/:series', fetcher.getSeries);
app.get('/dataset/:dataset', fetcher.getDataSet);
app.get('/datastructure/:dataset', fetcher.getDataStruc);
app.get('/dataflow',fetcher.getDataFlow);
app.get('/cal/:cals', fetcher.getCals);


app.listen(port, function() {
    console.log('Our app is running on port '+ port);
});


// Very dangerous
process.on('uncaughtException', (err) => {
     console.log(`Caught exception: ${err}`);
});
