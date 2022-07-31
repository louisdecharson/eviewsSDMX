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

import * as fs from 'fs';
import * as amqp from 'amqplib/callback_api.js';
import Debug from 'debug';

const logger = Debug('rabbit');

const urlrabbit = process.env.CLOUDAMQP_URL || "amqp://localhost",
      queueTasks = 'tasks',
      queueDone = 'done',
      dirTempFiles = './public/temp/';

// Create one connection
var state = {
  conn: null
};

// Function to connect
export function connect(cb) {
  if (state.conn) { cb();}
  amqp.connect(urlrabbit,function(err,conn) {
    if (err) {
      cb(err);
    } else {
      state.conn = conn;
      cb();
    }
  });
};
// expose connection
export function get() {
  return state.conn;
};

// Consume Reply from Reply on queue Done
// Write response on temp folder
export function consumeReply(conn) {
  conn.createChannel(function(err,ch) {
    ch.assertQueue(queueDone,{durable:false});
    ch.consume(queueDone,function(msg) {
      logger(msg);
      var reply = JSON.parse(msg.content),
          code = reply.code,
          data = reply.data;
      logger('Received reply with code: ' + code);
      var fileID = reply.id,
          file = dirTempFiles + fileID + '.html';
      fs.writeFile(file,data,function(er) {
        if (er) {
          console.log(er);
        } else {
          console.log("Data received. HTML written.");
        };
      });
    },{noAck: true});
  });
};

// Send Message to Worker
export function sendMessage(conn,m) {
  conn.createChannel(function(err,ch) {
    ch.assertQueue(queueTasks,{durable:false});
    ch.sendToQueue(queueTasks, new Buffer(m));
  });
};

// Send Temporary file and delete it
export function sendTempFile(fileID,cb) {
  var file = dirTempFiles + fileID + '.html',
      route = './../temp/' + fileID + '.html';
  setTimeout(function() {
    fs.unlink(file,function(err){
      if (err) {
        console.log(err);
      } else {
        logger('File %s deleted',file);
      }
    });
  }, 1000);
  cb(route);
};
