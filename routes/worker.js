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
// =====================================================================

var amqp = require('amqplib/callback_api'),
    request = require('request'),
    debug = require('debug')('worker'),
    xml2js = require('xml2js'),
    buildHTML = require('./buildHTML.js'),
    shortid = require('shortid'),
    fs = require('fs');

// Define parameters for Rabbit MQ
var url = process.env.CLOUDAMQP_URL || "amqp://localhost",
    q = 'tasks';  // channel



// Utilitaries
function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

amqp.connect(url,function(err,conn) {
    conn.createChannel(function(err,ch){
        ch.assertQueue(q, {durable:false});
        ch.consume(q,function(msg){
            var req = JSON.parse(msg.content),
                options = req.options,
                dataSet = req.dataSet,
                authParams = req.authParams,
                file = req.file; // where the file should be stored
            debug("Received message for url: %s",options.url);
            debug("File to be written at location: %s",file);
            request(options,function(e,r,b){
                if (r.statusCode >= 200 && r.statusCode < 400) {
                    xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err === null) {
                            debug("Data received, writing html file");
                            try {
                                var data = obj.StructureSpecificData.DataSet[0];
                                var vTS = data.Series; // vector of Time Series : vTS
                                fs.writeFile(file,buildHTML.makeTable(vTS,dataSet,authParams),function(er) {
                                    if (er) {
                                        console.log(er);
                                    } else {
                                        console.log("Data received. HTML written.");
                                    };
                                });
                            } catch(error) {
                                debug(error);
                                var errorMessage = "Error parsing SDMX at: " + options.url;
                                fs.writeFile(file,errorMessage,function(er) {
                                    if (er) {
                                        console.log(er);
                                    }
                                });
                                debug(errorMessage);
                            }
                        } else {
                            fs.writeFile(file,err,function(er){
                                if (er) {
                                    console.log(er);
                                }
                            });
                        }
                    });
                } else if (r.statusCode === 413) {
                    res.redirect('/413.html');
                } else {
                    var errorMessage = "Error retrieving data at: " + options.url + '\n';
                    errorMessage += 'Code: ' + r.statusCode + '\n';
                    errorMessage += 'Message: ' + r.statusMessage;
                    res.status(r.statusCode).send(errorMessage);
                    debug(r);
                }
            });
        },{noAck:true});
    });
});
