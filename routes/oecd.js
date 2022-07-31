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

// PACKAGES
import request from 'request';
import * as xml2js from 'xml2js';
import Debug from 'debug';
import * as buildHTML from './buildHTML.js';

const logger = Debug('oecd');

const urlOECD = 'http://stats.oecd.org/restsdmx/sdmx.ashx/';

function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

// FETCHER
export function getSeries(req,res) {
    var series = req.params.series,
        dataset = req.params.dataset,
        keys = Object.keys(req.query),
        params = "?";
    keys.forEach(function(it,ind,arr) {
        params += it.toString() + "=" + req.query[it] ;
        if (ind<arr.length-1) {
            params += "&";
        }
    });
    var myURL = urlOECD + 'GetData/' + dataset + '/' + series + params,
        options = {
            url: myURL,
            method: 'GET',
            headers: {
                'connection': 'keep-alive'
            }
        };
    logger('getSeries OECD with path=%s',options.url);
    request(options,function(e,r,b){
        if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                if(err === null) {
                    try {
                        var data = obj.MessageGroup.DataSet[0],
                            dataset = data.KeyFamilyRef;
                        var vTS = data.Series;
                        if (!req.timedout) {
                            res.send(buildHTML.makeTableOECD(vTS,series,dataset));
                        }}
                    catch(error) {
                        logger(error);
                        var errorMessage = "Error parsing SDMX at: " + options.url;
                        res.status(500).send(errorMessage);
                    }
                } else {
                    res.send(err);
                }
            });
        } else {
            res.status(r.statusCode).send(r.statusMessage);
            logger(e);
        }
    }); 
};

export function getAllDataFlow(req,res) {
    var myURL = urlOECD + 'GetDataStructure/all?format=SDMX-ML',
        options = {
            url: myURL,
            method: 'GET',
            headers: {
                'connection': 'keep-alive'
            }
        };
    logger('getAllDataflow OECD with path=%s',options.url);
    request(options,function(e,r,b){
        if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                if(err === null) {
                    var data = [];
                    try {
                        obj.Structure.KeyFamilies[0].KeyFamily.forEach(function(it,ind) {
                            data.push([it.id,it.id,it.agencyID,it.Name[0]['_'],'oecd']);
                        });
                        if (!req.timedout) {
                            res.send(buildHTML.dataFlow(data,'oecd'));
                        }}
                    catch(error) {
                        logger(error);
                        var errorMessage = "Error parsing SDMX at: " + options.url;
                        res.status(500).send(errorMessage);
                    }
                } else {
                    res.send(err);
                }
            });
        } else {
            res.status(r.statusCode).send(r.statusMessage);
            logger(e);
        }
    }); 
};

export function getDataflow(req,res) {
    var dataset = req.params.dataset,
        myURL = urlOECD + 'GetDataStructure/'+ dataset,
        options = {
            url: myURL,
            method: 'GET',
            headers: {
                'connection': 'keep-alive'
            }
        };
    logger('getDataflow OECD with path=%s',options.url);
    request(options,function(e,r,b){
        if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                if(err === null) {
                    try {
                        // get Dimensions
                        var dim = obj.Structure.KeyFamilies[0].KeyFamily[0].Components[0].Dimension;
                        if (!req.timedout) {
                            res.send(buildHTML.OECDDimensions(dim,dataset));
                        }}
                    catch(error) {
                        logger(error);
                        var errorMessage = "Error parsing SDMX at: " + options.url;
                        res.status(500).send(errorMessage);
                    }
                } else {
                    res.send(err);
                }
            });
        } else {
            res.status(r.statusCode).send(r.statusMessage);
            logger(e);
        }
    }); 
};

export function getCodeList(req,res) {
    var codeList = req.params.codelist,
        dataset = req.query.Dataset,
        fullCodeList = "CL_" + dataset + "_" + codeList,
        myURL = urlOECD + 'GetDataStructure/'+ dataset + '/all?format=SDMX-ML',
        options = {
            url: myURL,
            method: 'GET',
            headers: {
                'connection': 'keep-alive'
            }
        };
    logger('getCodeList OECD with path=%s,codelist=%s for dataset=%s',options.url,codeList,dataset);
    request(options,function(e,r,b){
        if (r.statusCode >= 200 && r.statusCode < 400 && !e) {
            xml2js.parseString(b, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                if(err === null) {
                    try {
                        // get Dimensions
                        //var codelists = obj.Structure.CodeList;
                        obj.Structure.CodeLists[0].CodeList.forEach(function(it,ind){                       
                            if (it.id[0] === fullCodeList) {
                                if (!req.timedout) {
                                    res.send(buildHTML.OECDCodeList(it,codeList,dataset));
                                }
                            }
                        });
                    }
                    catch(error) {
                        logger(error);
                        var errorMessage = "Error parsing SDMX at: " + options.url;
                        res.status(500).send(errorMessage);
                    }
                } else {
                    res.send(err);
                }
            });
        } else {
            res.status(r.statusCode).send(r.statusMessage);
            logger(e);
        }
    }); 
};

