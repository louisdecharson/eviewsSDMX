var express = require('express'),
    path = require('path'),
    fetcher = require('./routes/fetcher');


var app = express();

var port = process.env.PORT || 8080;

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname + '/routes/index.html'));
});

app.get('/:series', fetcher.getSeries);
        


app.listen(port, function() {
    console.log('Our app is running on port '+ port);
});


// Very dangerous
process.on('uncaughtException', (err) => {
    console.log(`Caught exception: ${err}`);
});
