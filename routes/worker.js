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

import * as amqp from "amqplib/callback_api.js";
import Debug from "debug";
import { parseString } from "xml2js";
import * as fs from "fs";
import * as buildHTML from "./buildHTML.js";
import { handleRequest } from "./request.js";
import { XML_PARSER_OPTIONS } from "./fetcher.js";

const logger = Debug("fetcher");

// Define parameters for Rabbit MQ
const urlrabbit = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queueTasks = "tasks";
const queueDone = "done"; // queue for Tasks

function addMessageToDone(channel, HTMLcode, data, id = 0) {
  const reply = {
    code: HTMLcode,
    data,
    id,
  };
  const content = Buffer.from(JSON.stringify(reply));
  channel.sendToQueue(queueDone, content);
}

/**
 * Create error string
 * @param {string} url - url at which the error occurred.
 * @param {object} error - error message
 */
function createErrorContent(url, error) {
  const errorMessage = `Error when retrieving data to ${url}. Error: ${error}.`;
  return buildHTML.bigDatasetError(errorMessage);
}

function retrieveData(channel, message) {
  const task = JSON.parse(message.content);
  const { dataset, dimensions, url, contentType, context, id } = task;
  handleRequest(url, contentType, context).then(({ error, content }) => {
    if (error) {
      addMessageToDone(channel, 500, createErrorContent(url, error));
    } else {
      parseString(content, XML_PARSER_OPTIONS, (xmlParserErr, obj) => {
        if (xmlParserErr === null) {
          try {
            const timeseries = obj.StructureSpecificData.DataSet[0].Series;
            const table = buildHTML.makeTable(timeseries, dataset, dimensions);
            addMessageToDone(channel, 200, table.toString(), id);
          } catch (parserErr) {
            try {
              const footer =
                obj.StructureSpecificData.Footer[0].Message[0].code[0];
              if (footer === "413") {
                addMessageToDone(
                  channel,
                  413,
                  createErrorContent(
                    url,
                    "Dataset is too big to be retrieved. Try to filter it."
                  )
                );
              } else {
                addMessageToDone(
                  channel,
                  500,
                  createErrorContent(url, parserErr)
                );
              }
            } catch (_) {
              addMessageToDone(
                channel,
                500,
                createErrorContent(url, parserErr)
              );
            }
          }
        } else {
          addMessageToDone(channel, 500, createErrorContent(url, xmlParserErr));
        }
      });
    }
  });
}
function main() {
  amqp.connect(urlrabbit, (err, conn) => {
    if (err) {
      logger(err);
      console.log(err);
    } else {
      logger("Connection to worker established");
      conn.createChannel((channelCreationError, channel) => {
        channel.assertQueue(queueTasks, { durable: false });
        channel.consume(queueTasks, (msg) => retrieveData(channel, msg), {
          noAck: true,
        });
      });
    }
  });
}

try {
  main();
} catch (error) {
  console.log("Error caught: " + error);
}
