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

// Worker listen for work on queue tasks and
// reply on queue done;

var amqp = require('amqplib/callback_api'),
    request = require('request'),
    debug = require('debug')('worker'),
    xml2js = require('xml2js'),
    buildHTML = require('./buildHTML.js'),
    fs = require('fs');

// Define parameters for Rabbit MQ
var url = process.env.CLOUDAMQP_URL || "amqp://localhost",
    queueTasks = 'tasks',
    queueDone = 'done'; // queue for Tasks

// Utilitaries
function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

ampq.connect(url)
    .then((conn) => {
        if (conn){
            console.log("Established connection to worker.");
            conn.createChannel(function(err,ch){
                ch.assertQueue(queueTasks, {durable:false});
                ch.consume(queueTasks,function(msg){
                    var req = JSON.parse(msg.content),
                        options = req.options,
                        dataSet = req.dataSet,
                        authParams = req.authParams,
                        fileID = req.file; // where the file should be stored
                    debug("Received message for url: %s",options.url);
                    debug("Id: %s",fileID);
                    request(options,function(e,r,b){
                        var reply = {id: fileID};
                        if (r.statusCode >= 200 && r.statusCode < 400) {
                            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                                if(err === null) {
                                    debug("Data received, sending reply");
                                    try {
                                        var data = obj.StructureSpecificData.DataSet[0];
                                        var vTS = data.Series; // vector of Time Series : vTS
                                        reply.code = 200;
                                        reply.data = buildHTML.makeTable(vTS,dataSet,authParams).toString();
                                        ch.sendToQueue(queueDone,
                                                       new Buffer(JSON.stringify(reply))
                                                      );
                                    } catch(error) {
                                        debug(error);
                                        var errorMessage = "Error parsing SDMX at: " + options.url;
                                        reply.code = 500;
                                        reply.data = buildHTML.bigDatasetError(errorMessage);
                                        ch.sendToQueue(queueDone,
                                                       new Buffer(JSON.stringify(reply)));

                                        debug(errorMessage);
                                    }
                                } else {
                                    reply.code = 500;
                                    reply.data = buildHTML.bigDatasetError('Internal server error. ' + err);
                                    ch.sendToQueue(queueDone,
                                                   new Buffer(JSON.stringify(reply)));
                                }
                            });
                        } else if (r.statusCode === 413) {
                            reply.code = 413;
                            reply.data = buildHTML.bigDatasetError('Error 413.');
                            ch.sendToQueue(queueDone,
                                           new Buffer(JSON.stringify(reply)));
                        } else {
                            var errorMessage = "Error retrieving data at: " + options.url + '\n';
                            errorMessage += 'Code: ' + r.statusCode + '\n';
                            errorMessage += 'Message: ' + r.statusMessage;
                            reply.code = 500;
                            reply.data = buildHTML.bigDatasetError(errorMessage);
                            ch.sendToQueue(queueDone,
                                           new Buffer(JSON.stringify(reply)));
                            debug(r);
                        }
                    });
                },{noAck:true});
            });
        } else {
            console.log("Connection to worker not working");
        }
    })
    .catch(err => console.log(err.stack));
