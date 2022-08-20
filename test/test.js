// Copyright (C) 2022 Louis de Charsonville
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3 as
// published by the Free Software Foundation.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import chai from "chai";
import chaiHttp from "chai-http";
import app from "../server.js";
import { createRequire } from "module";

const should = chai.should();
chai.use(chaiHttp);

const require = createRequire(import.meta.url);
const urls = require("./urls.json");

Object.keys(urls.paths).forEach((provider) => {
  Object.keys(urls.paths[provider]).forEach((test) => {
    const description = `GET / {test}`;
    const url = urls.paths[provider][test];
    describe(description, () => {
      it(`should get status 200 for url ${url}`, (done) => {
        chai
          .request(app)
          .get(url)
          .end((err, res) => {
            if (err) {
              throw err;
            }
            res.should.have.status(200);
            done();
          });
      }).timeout(10000);
    });
  });
});
