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

import * as fs from "fs";
import * as amqp from "amqplib/callback_api.js";
import Debug from "debug";

const logger = Debug("rabbit");

const urlrabbit = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queueTasks = "tasks";
const queueDone = "done";
const dirTempFiles = "./public/temp/";

// Create one connection
const state = {
  conn: null,
};

// Function to connect
export function connect(callback) {
  if (state.conn) {
    callback();
  }
  amqp.connect(urlrabbit, (err, conn) => {
    if (err) {
      callback(err);
    } else {
      state.conn = conn;
      callback();
    }
  });
}
// expose connection
export function get() {
  return state.conn;
}

// Consume Reply from Reply on queue Done
// Write response on temp folder
export function consumeReply(conn) {
  conn.createChannel((err, ch) => {
    ch.assertQueue(queueDone, { durable: false });
    ch.consume(
      queueDone,
      (msg) => {
        const reply = JSON.parse(msg.content);
        const { code, data, id } = reply;
        logger(`Received reply with code: ${code}. id: ${id};`);
        const filePath = `${dirTempFiles}${id}.html`;
        fs.writeFile(filePath, data, (error) => {
          if (error) {
            logger(error);
          } else {
            logger(`Data received. HTML written to ${filePath}`);
          }
        });
      },
      { noAck: true }
    );
  });
}

// Send Message to Worker
export function sendMessage(conn, msg) {
  conn.createChannel((error, ch) => {
    ch.assertQueue(queueTasks, { durable: false });
    ch.sendToQueue(queueTasks, Buffer.from(msg));
  });
}

//
/**
 * Calls callback with request route and delete the file after 1000ms.
 * Callback is res.redirect function. This function calls res.redirect with route
 * to the function that will return the temporary file and deletes the file after
 * 1000ms.
 * @param {string} id - file id
 * @param {callable} callback - function to call with route (res.redirect)
 */
export function sendTempFile(id, callback) {
  const filePath = `${dirTempFiles}${id}.html`;
  const route = `./../temp/${id}.html`;
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        logger(err);
      } else {
        logger("File %s deleted", filePath);
      }
    });
  }, 1000);
  callback(route);
}
