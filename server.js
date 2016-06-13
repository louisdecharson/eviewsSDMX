var express = require('express'),
    path = require('path'),
    fetcher = require('./routes/fetcher');


var app = express();
// var router = express.Router();

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname + '/routes/index.html'));
});

app.get('/:series', fetcher.getSeries);
        


app.listen(80);
console.log('Listening on port 80...');
