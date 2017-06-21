// Copyright (C) 2017 Louis de Charsonville
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License version 3 as
// published by the Free Software Foundation.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../server');
var should = chai.should();
chai.use(chaiHttp);

const urls = require('./urls.json');

for(var provider in urls.paths){
    for(var test in urls.paths[provider]){
        var desc = ' GET / ' + test,
            url = urls.paths[provider][test];
        describe(desc,function(){
            this.timeout(10000);
            var str = 'status 200 for' + url;
            it(str, function(done) {
                chai.request(app)
                    .get(url)
                    .end(function(err,res) {
                        if (err) {
                            throw err;
                        }
                        res.should.have.status(200);
                        done();
                    });
            });
        });
    }
}
