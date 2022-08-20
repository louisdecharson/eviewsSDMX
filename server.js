// Copyright (C) 2016 Louis de Charsonville
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3 as
// published by the Free Software Foundation.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// EXTERNAL MODULES
import express from "express";
import path from "path";
import bodyParser from "body-parser";
import timeout from "connect-timeout";
import favicon from "serve-favicon";
import Debug from "debug";
import { createRequire } from "module";

// Routes
import * as sdmx from "./fetchers/sdmx.js";
import * as bls from "./fetchers/bls.js";
import * as fred from "./fetchers/fred.js";
import * as buba from "./fetchers/buba.js";
import * as oecd from "./fetchers/oecd.js";
import * as explore from "./routes/explore.js";

// RABBIT MQ
import * as rabbit from "./queue/rabbit.js";
import { error404 } from "./render/components.js";

// Providers
const require = createRequire(import.meta.url);
const providers = require("./routes/providers.json");

const __dirname = path.resolve();
const logger = Debug("server");

const app = express();
const port = process.env.PORT || 8080;

// TIMEOUT
function haltOnTimedout(err, req, res, next) {
  if (req.timedout === true) {
    if (res.headersSent) {
      next(err);
    } else {
      res.redirect("/timedout.html");
    }
  } else {
    next();
  }
}
app.use(timeout("29.9s", { respond: true }));

logger("booting %s", "EViews - SDMX");

app.use(bodyParser.json({ limit: "50mb" }));
app.use(haltOnTimedout);
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(haltOnTimedout);
app.use("/", express.static(__dirname + "/public/"));
app.use(haltOnTimedout);

// Favicon
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(haltOnTimedout);

// SDMX PROVIDER
// -----------------------
// OECD
app.get("/oecd/dataflow/:dataset", oecd.getDataflow);
app.get("/oecd/codelist/:codelist", oecd.getCodeList);
app.get("/oecd/:dataset/:series", oecd.getSeries);
app.get("/oecd/dataflow", oecd.getAllDataFlow);

// Timeseries from supported providers
app.get("/:provider/dataflow", sdmx.getAllDataFlow);
app.get("/:provider/dataflow/:dataset", sdmx.getDataFlow);
app.get("/:provider/dataset/:dataset", sdmx.getDataSet);
app.get("/:provider/bigdataset/:dataset", sdmx.getBigDataSet);
app.get("/:provider/series/:series", sdmx.getSeries);
app.get("/:provider/list/:dataset", sdmx.getList);
app.get("/:provider/codelist/:codelist", sdmx.getCodeList);

// Timeseries from sdmx url
app.get("/req", sdmx.getDatafromURL);
app.post("/requestbyURL", sdmx.redirectURL);

// Big datasets
app.get("/temp/:id", sdmx.getTemp);

// OTHER NON-SDMX PROVIDER
// -----------------------
// Quandl
app.get("/quandl/:anything", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.status(501).send("NO LONGER SUPPORTED");
});
// BLS
app.get("/bls/:apiKey/:series", bls.getSeries);
// FRED
app.get("/fred/:apiKey/:series", fred.getSeries);
// Bundesbank
app.get("/buba/:series", buba.getSeries);

// Other functions
app.get("/providers", explore.getProviders);

// Calendar
// --------
app.get("/cal", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send("NO LONGER SUPPORTED");
});

app.get("/status", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.status(200).send("OK");
});

app.get("/:provider", (req, res) => {
  const listProviders = Object.keys(providers);
  const { provider } = req.params;
  if (listProviders.indexOf(provider.toUpperCase()) > -1) {
    res.redirect(`/${provider}/dataflow`);
  } else {
    res.status(404).send(error404());
  }
});

// 404
app.get("*", (req, res) => {
  res.status(404).send(error404());
});

// TIMEOUT
app.use(haltOnTimedout);

// Rabbit MQ
rabbit.connect((c) => {
  try {
    const conn = rabbit.get();
    if (conn) {
      rabbit.consumeReply(conn);
    } else {
      console.log("Connection to RabbitMQ not available.");
    }
    app.listen(port, () => {
      console.log(`Our app is running on port ${port}`);
    });
  } catch (error) {
    console.log(`Connection to RabbitMQ not available. Error: ${error}`);
    app.listen(port, () => {
      console.log(`Our app is running on port ${port}`);
    });
  }
});

// Very dangerous
process.on("uncaughtException", (err) => {
  console.log(`Caught exception: ${err}`);
});

// FOR TESTING
export default { app };
