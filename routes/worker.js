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

import * as amqp from 'amqplib/callback_api.js';
import request from 'request';
import * as debug from 'debug';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import { makeTable } from './buildHTML.js';


const logger = debug('worker');

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

try {
    amqp.connect(url, (err, conn) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Established connection to worker.");
            conn.createChannel(function(err,ch){
                if (err) {
                    console.log("Unable to create channel. " + err);
                } else {
                    ch.assertQueue(queueTasks, {durable:false});
                    ch.consume(queueTasks,function(msg){
                        var req = JSON.parse(msg.content),
                            options = req.options,
                            dataSet = req.dataSet,
                            authParams = req.authParams,
                            fileID = req.file; // where the file should be stored
                        logger("Received message for url: %s",options.url);
                        logger("Id: %s",fileID);
                        request(options,function(e,r,b){
                            var reply = {id: fileID};
                            if (r.statusCode >= 200 && r.statusCode < 400) {
                                xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                                    if(err === null) {
                                        logger("Data received, sending reply");
                                        try {
                                            var data = obj.StructureSpecificData.DataSet[0];
                                            var vTS = data.Series; // vector of Time Series : vTS
                                            reply.code = 200;
                                            reply.data = buildHTML.makeTable(vTS,dataSet,authParams).toString();
                                            ch.sendToQueue(queueDone,
                                                           new Buffer(JSON.stringify(reply))
                                                          );
                                        } catch(error) {
                                            logger(error);
                                            var errorMessage = "Error parsing SDMX at: " + options.url;
                                            reply.code = 500;
                                            reply.data = buildHTML.bigDatasetError(errorMessage);
                                            ch.sendToQueue(queueDone,
                                                           new Buffer(JSON.stringify(reply)));

                                            logger(errorMessage);
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
                                logger(r);
                            }
                        });
                    },{noAck:true});
                }
            });
        }
    });
} catch (error) {
    console.log("Error caught: " + error);
}
