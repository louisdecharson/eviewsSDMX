var xml2js = require('xml2js'),
    assert = require('assert'),
    concat = require('concat-stream'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    ical = require('ical-generator'),
    moment = require('moment-timezone'),
    forms = require('forms'),
    bodyParser = require('body-parser'),
    http = require('http');



var urlINSEE = "http://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/";
var parser = new xml2js.Parser();



function stripPrefix(str){
    var prefixMatch;
    prefixMatch = new RegExp(/(?!xmlns)^.*:/);
    return str.replace(prefixMatch, '');
}

function getDim(dataSet, callback) {
    var nbDim = 0;
    var arrDim = [];
    
    var myPath = "/series/sdmx/datastructure/FR1/" + dataSet;
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
            }
    };
    http.get(options, function(result) {
        if (result.statusCode >=200 && result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });
            result.on('end',function() {
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err == null) {
                        var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                        nbDim = data.length;
                        data.forEach(function(item,index) {
                            arrDim.push(item['id'][0]);
                        });
                        callback([nbDim,arrDim]); 
                    }
                });
            });
        } 
    });
};


function buildDataStruc(data,title) {
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body ='';

    var Dim = '<p>Nb of dimensions : '+data.length+'</p>';
    var listDim = 'Dimensions list : <ul> ';

    data.forEach(function(item,index) {
        listDim += '<li>'+ item['position'][0] + ". " + item['id'][0]+'</li>';
    });
    listDim += '</ul>';
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + Dim + listDim + '</body></html>';
    return myHtml;
    
};

function buildDataflows(data) {
    var header = '<title>SDMX API for EViews / DATAFLOWS </title>';
    var body = '',
        table = '',
        theader = '<th>Id</th><th>Description (FR)</th><th>Description (EN)</th>',
        tbody = '';
    
    data.forEach(function(item,index){
        tbody += '<tr><td>' + item.id + '</td><td>';
        tbody += item.Name[0]['_'] + '</td><td>';
        tbody += item.Name[1]['_'] + '</td><td>';
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table><col width="200"' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
};                 


function buildHtml(vTS,title){
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th>';
    var theader2 = '<th>&nbsp;</th>';
    var tbody = '';

    var vTsSorted = vTS.sort(function(a,b) { return b.Obs.length-a.Obs.length;});
    var nbObs = vTsSorted[0].Obs.length;
    var vInd = new Array(vTS.length).fill(0);

    var vTsSR = [];
    
    // HEADER 
    for(var kk=0; kk<vTsSorted.length; kk++) {
        theader1 += '<th>' + vTsSorted[kk].IDBANK[0] + '</th>';
        theader2 += '<th>' + vTsSorted[kk].TITLE[0] + '</th>';
        vTsSR.push(vTsSorted[kk].Obs.reverse());
    }
    
    // BODY
    var i = 0;

    while (i < nbObs) {
        tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0] + '</td>';
        tbody += '<td style="text-align:center">' + vTsSR[0][i].OBS_VALUE[0] + '</td>';
        for(var k=1; k<vTsSR.length; k++) {
            if(vInd[k] < vTsSR[k].length) {
                if(vTsSR[0][i].TIME_PERIOD[0] == vTsSR[k][vInd[k]].TIME_PERIOD[0]) {
                    tbody += '<td style="text-align:center">' + vTsSR[k][vInd[k]].OBS_VALUE[0] + '</td>';
                    vInd[k] =  vInd[k] + 1;
                } else {
                    tbody += '<td style="text-align:center"></td>';
                }
            } else {
                tbody += '<td style="text-align:center"></td>';
            }
        }
        tbody += '</tr>';
        i ++;
    };
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table>' + '<thead>'  + '<tr>' + theader1 + '</tr>' + '<tr>' + theader2 + '</tr>'  + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    
    return myHtml;
}



function getFreq(freq){
    return freq.toUpperCase() + "...." ;
}


exports.getSeries = function(req,res) {
    
    var arr = req.params.series.split('+');
    var series = req.params.series;
    var startPeriod = req.param('startPeriod');
    var lastNObservations = req.param('lastNObservations');
    var myPath = '';

    if(startPeriod == null && lastNObservations == null){
        myPath = "/series/sdmx/data/SERIES_BDM/"+series;
    } else if (startPeriod!= null){
        myPath = "/series/sdmx/data/SERIES_BDM/"+series+"?startPeriod="+startPeriod;
    } else {
        myPath = "/series/sdmx/data/SERIES_BDM/"+series+"?lastNObservations="+lastNObservations;
    }
    
    var options = {
        hostname: 'www.bdm.insee.fr',
        port: 80,
        path: myPath,
        headers: {
            'connection': 'keep-alive',
            'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
        }
    };
    
    http.get(options, function(result) {
        if (result.statusCode >= 200 && result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });
            result.on('end',function() {
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err == null) {
                        var data = obj.StructureSpecificData.DataSet[0];
                        var vTS = data.Series;
                        res.send(buildHtml(vTS,arr[0]));
                    }
                    else{
                        res.send(err);
                    }
                });
            });
        }
        else {
            res.send(result.statusCode);
        }
    });
};

exports.getDataSet = function(req,res) {

    // All keys to UpperCase
    var key, keys = Object.keys(req.query);
    var n = keys.length;
    var reqParams={};
    while (n--) {
        key = keys[n];
        reqParams[key.toUpperCase()] = req.query[key];
    }
    var dataSet = req.params.dataset.toUpperCase();
    var startPeriod = reqParams['STARTPERIOD'];
    var lastNObservations =  reqParams['LASTNOBSERVATIONS'];
    
    var myPath = "/series/sdmx/data/"+dataSet;
    var userParams = '';

    getDim(dataSet, function(arr) {
        var authParams = arr[1];
        authParams.forEach(function(it,ind){
            if(reqParams[it] != null) {
                if(ind<arr[0]-1) {
                    userParams += reqParams[it]+'.';
                } else {
                    userParams += reqParams[it];
                }
            }
            else {
                userParams += '.';
            }
        });
        myPath += '/' + userParams;
        if (startPeriod != null){
            myPath += "?startPeriod="+startPeriod;
        } else if (lastNObservations != null) {
            myPath += "?lastNObservations="+lastNObservations;
        }
        
        var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive',
                'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
            }
        };
        http.get(options, function(result) {
            if (result.statusCode >= 200 && result.statusCode < 400) {
                var xml = '';
                result.on('data', function(chunk) {
                    xml += chunk;
                });

                result.on('end',function() {
                    xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                        if(err == null) {
                            var data = obj.StructureSpecificData.DataSet[0];
                            var vTS = data.Series;
                            res.send(buildHtml(vTS,dataSet));
                        } else {
                            res.send(err);
                        }
                    });
                });
            } else {
                res.send(result.statusCode);
            }
        });
    });
};

exports.getDataFlow = function(req,res) {

    var myPath = '/series/sdmx/dataflow';
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
            }
    };
    http.get(options, function(result) {
        if (result.statusCode >=200 && result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });

            result.on('end',function() {
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err == null) {
                        var data = obj['Structure']['Structures'][0]['Dataflows'][0]['Dataflow'];
                        res.send(buildDataflows(data));
                    } else {
                        res.send(err);
                    }
                });
            });
        } else {
            res.send(result.statusCode);
        }
    });    
};


exports.getDataStruc = function(req,res) {

    var dataSet = req.params.dataset;
    var myPath = "/series/sdmx/datastructure/FR1/" + dataSet;
    var options = {
            hostname: 'www.bdm.insee.fr',
            port: 80,
            path: myPath,
            headers: {
                'connection': 'keep-alive'
            }
    };
    http.get(options, function(result) {
        if (result.statusCode >=200 && result.statusCode < 400) {
            var xml = '';
            result.on('data', function(chunk) {
                xml += chunk;
            });

            result.on('end',function() {
                xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
                    if(err == null) {
                        var data = obj['Structure']['Structures'][0]['DataStructures'][0]['DataStructure'][0]['DataStructureComponents'][0]['DimensionList'][0]['Dimension'];
                        var nbDimension = data.length;
                        res.send(buildDataStruc(data,dataSet));
                    } else {
                        res.send(err);
                    }
                });
            });
        } else {
            res.send(result.statusCode);
        }
    });
};


function getMonth(mois) {
    if (mois == "janvier") {
        return "01";
    } else if (mois == "février") {
        return "02";
    } else if (mois == "mars") {
        return "03";
    } else if (mois == "avril") {
        return "04";
    } else if (mois == "mai") {
        return "05";
    } else if (mois == "juin") {
        return "06";
    } else if (mois == "juillet") {
        return "07";
    } else if (mois == "août") {
        return "08";
    } else if (mois == "septembre") {
        return "09";
    } else if (mois == "octobre") {
        return "10";
    } else if (mois == "novembre") {
        return "11";
    } else if (mois == "décembre") {
        return "12";
    } else {
        return "00";
    }
};

function getHour(heure) {
    var v = heure.split("h");
    var ret = "";
    if (v[0].length < 2) {
        v[0] = "0"+v[0];
        ret = v[0]+":"+v[1]+":00";
        return ret;
    } else {
        ret = v[0]+":"+v[1]+":00";
        return ret;
    }
};

function getDay(jour){
    var ret = "";
    if (jour.length < 2) {
        ret = "0"+jour;
        return ret;
    } else {
        ret = jour;
        return ret;
    }
}

function buildCal(vecEv) {
    var cal = ical({
        domain: 'sdmx.herokuapp.com',
        name: 'Calendrier des publications Insee'
    });
    vecEv.forEach(function(it,ind){
        var myDate = it[1][2]+"-"+getMonth(it[1][1])+"-"+getDay(it[1][0])+"T"+getHour(it[1][4]);
        // var startDate = new Date(myDate);
        var startDate = new Date(moment.tz(myDate,"Europe/Paris").format());
        // console.log(startDate);
        var endDate = new Date(startDate.getTime()+3600000);
        cal.createEvent({
            start: startDate,
            end: endDate,
            summary: it[0],
            description: '',
            organizer: 'Insee <contact@insee.fr>'
        }); 
    });
    return cal.toString();
};


exports.getCals = function(req,res) {

    var cals = req.params.cals.split('+');
    var myPath = "http://www.insee.fr/fr/service/agendas/agenda.asp?page=agenda_indic.htm";
    var options = {
        encoding: null,
        method: "GET",
        uri: myPath       
    };
    request(options, function(err, response, html) {
        if (!err && response.statusCode == 200) {
            var htmldecode = iconv.decode(new Buffer(html), "ISO-8859-1");
            var $ =  cheerio.load(htmldecode);
            var vecEv = [];
            if (cals.length == 1 && cals[0]== "all") {
                var myUrl = 'li[class="princ-ind"]';
                $(myUrl).each(function(i,element){
                    var ev = $(this).children().children().text().trim().replace('/+\t+/gm', '');
                    var vectDate = $(this).children().next().text().split(" ");
                    vecEv.push([ev,vectDate]);
                });
                res.setHeader("Content-Type", 'text/calendar');
                res.send(buildCal(vecEv));
            } else {
                cals.forEach(function(it,ind){
                    var myUrl = 'a[href="/fr/themes/indicateur.asp?id='+it.toString()+'"]';
                    $(myUrl).each(function(i,element){
                        var ev = $(this).text().trim().toString().replace('/+\t+/gm', '');
                        var vectDate = $(this).parent().next().text().split(" ");
                        vecEv.push([ev,vectDate]);
                    });
                });
                res.setHeader("Content-Type", 'text/calendar');
                res.send(buildCal(vecEv));
            }
        } else {
            res.send(err);
            console.log(err);
        }
    });
};


function buildForm(vecEv) {

    var header = '<title>Calendrier de l\'Insee</title>';
    var bootstrap = '<link rel="stylesheet" href="https://cdn.rawgit.com/twbs/bootstrap/v4-dev/dist/css/bootstrap.css" integrity="sha384-XXXXXXXX" crossorigin="anonymous"><script src="https://cdn.rawgit.com/twbs/bootstrap/v4-dev/dist/js/bootstrap.js" integrity="sha384-XXXXXXXX" crossorigin="anonymous"></script>';
    var body = '<h2>Importez les dates de publications de l\'Insee dans votre calendrier</h2><p><strong>Choissisez les événements auquels vous souhaitez vous abonner</strong></p>';
    var css = '<style>h2,form,p {margin-left:10px} </style>';
    var form = '<form action="createCal" method="POST">';
    vecEv.forEach(function(it,ind) {
        if (ind==0){
            form += '<input type="checkbox" name="cal" value="all"><strong>Tous les événements</strong><br><i>ou</i><br>';
        } else {
            form += '<input type="checkbox" name="cal" value="'+ it[0] + '"> '+ it[1]  +'<br>';
        };
    });
    form += '<br><input type="submit" value="Créer calendrier"></form>';
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + css + '</header><body>' + body + form + '</body></html>';
    return myHtml;
    
};

exports.getFormCal = function(req,res) {
    var myPath = "http://www.insee.fr/fr/service/agendas/agenda.asp?page=agenda_indic.htm";
    var options = {
        encoding: null,
        method: 'GET',
        uri: myPath
    };
    request(options, function(err,response,html) {
        if (!err && response.statusCode == 200) {
            var htmldecode = iconv.decode(new Buffer(html), "ISO-8859-1");
            var $ = cheerio.load(htmldecode);
            var vecEv = [];
            var maClasse = 'select[id="indic"]';
            $(maClasse).children().each(function(i,element) {
                var id = $(this).attr('value');
                var nom = $(this).attr('title');
                vecEv.push([id,nom]);
            });
            res.send(buildForm(vecEv));
        }
        else {
            res.send(err);
            console.log(err);
        }
    });
};

exports.sendCal = function(req,res) {
    var params = req.param('cal');
    if (Array.isArray(params) && params.length > 1) {
        params = params.join("+");
    };
    var route = "/cal/" + params;
    var url = "webcal://sdmx.herokuapp.com/"+route;
    res.redirect(route);
};

// exports.getDataSet = function(req,res) {

//     // All keys to UpperCase
//     var key, keys = Object.keys(req.query);
//     var n = keys.length;
//     var reqParams={};
//     while (n--) {
//         key = keys[n];
//         reqParams[key.toUpperCase()] = req.query[key];
//     }
    
//     var dataSet = req.params.dataset.toUpperCase();
//     var freq = req.param('FREQ');
//     var startPeriod = req.param('startPeriod');
//     var lastNObservations =  req.param('lastNObservations');
    
//     var myPath = "/series/sdmx/data/"+dataSet;
//     var userParams = '';
//     getDim(dataSet, function(arr) {
//         var authParams = arr[1];
//         authParams.forEach(function(it,ind){
//             console.log(it);
//             if(reqParams[it] != null) {
//                 userParams += req.param(it);
//             }
//             else {
//                 userParams += '.';
//             }
//             console.log(userParams);
//         });
//     });
    
//     if(freq == null){
//         res.send('Error -> you must filter by frequency.');
//     } else {
//         freq = getFreq(freq);
//         myPath += '/' + freq ;
//         if (startPeriod != null){
//         myPath += "?startPeriod="+startPeriod;
//         } else if (lastNObservations != null) {
//             myPath += "?lastNObservations="+lastNObservations;
//         }
        
//         var options = {
//             hostname: 'www.bdm.insee.fr',
//             port: 80,
//             path: myPath,
//             headers: {
//                 'connection': 'keep-alive',
//                 'accept': 'application/vnd.sdmx.structurespecificdata+xml;version=2.1'
//             }
//         };
//         http.get(options, function(result) {
//             if (result.statusCode >= 200 && result.statusCode < 400) {
//                 var xml = '';
//                 result.on('data', function(chunk) {
//                     xml += chunk;
//                 });

//                 result.on('end',function() {
//                     xml2js.parseString(xml, {tagNameProcessors: [stripPrefix], mergeAttrs : true}, function(err,obj){
//                         if(err == null) {
//                             var data = obj.StructureSpecificData.DataSet[0];
//                             var vTS = data.Series;
//                             res.send(buildHtml(vTS,dataSet));
//                         } else {
//                             res.send(err);
//                         }
//                     });
//                 });
//             } else {
//                 res.send(result.statusCode);
//             }
//         });
//     }
// };
