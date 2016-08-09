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

var assert = require('assert'),
    concat = require('concat-stream'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    ical = require('ical-generator'),
    moment = require('moment-timezone'),
    forms = require('forms'),
    http = require('http');


// CALENDRIER
// ==========


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


// Construit le calendrier à partir de la liste des évenements
function buildCal(vecEv,alarms) {
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
        var event = cal.createEvent({
            start: startDate,
            end: endDate,
            summary: it[0],
            description: '',
            organizer: 'Insee <contact@insee.fr>'
        });
        if (Array.isArray(alarms)) {
            alarms.forEach(function(item,index){
                event.createAlarm({type: 'display', trigger: item*60});
            });
        } else if (typeof alarms != 'undefined') {
            event.createAlarm({type: 'display', trigger: alarms*60});
        }
    });
    return cal.toString();
};


// Créer la liste des évenements en fonction des publications sélectionnées
exports.getCals = function(req,res) {

    var cals = req.params.cals.split('+');
    var alarms = req.query.alarm;
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
                res.send(buildCal(vecEv,alarms));
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
                res.send(buildCal(vecEv,alarms));
            }
        } else {
            res.send(err);
            console.log(err);
        }
    });
};


// FUNCTIONS JQUERY DANS LE HTML
// =============================
// function getUrl() {
//     var elementsCal = document.getElementsByName('cal');
//     var cals = [];
//     for(var i=0; i<elementsCal.length; i++) {
//         if (elementsCal[i].checked) {
//             cals.push(elementsCal[i].value);
//         }
//     }
//     cals = cals.join('+');
//     var alarms = [];
//     var elementsAlarm = document.getElementsByName('cal');
//     for(var i=0; i<elementsAlarm.length; i++) {
//         if (elementsAlarm[i].checked) {
//             alarms.push(elementsAlarm[i].value);
//         }
//     }
//     alarms = alarms.join('&alarm=');
//     var route = 'webcal://sdmx.herokuapp.com/cal' + cals ;
//     if (alarms.length > 0) {
//         route = route + '?alarm=' + alarms ;
//     }
//     document.getElementById('myUrl').innerHTML = route;
// }


// $(document).ready(function() {
//     $('.myCheckbox').click(function() {
//         var myElem = $(this).parents('a');
//         if (myElem.hasClass('aactive')) {
//             myElem.removeClass('aactive');
//         } else {
//             myElem.addClass('aactive');
//         }
//     });
// });
// =============================

// Construit la page Web formulaire
function buildForm(vecEv) {

    var header = '<title>Calendrier de l\'Insee</title>';
    var bootstrap4 = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.3/css/bootstrap.min.css" integrity="sha384-MIwDKRSSImVFAZCVLtU0LMDdON6KVCrZHyVQQj6e8wIEJkW4tvwqXrbMIya1vriY" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.3/js/bootstrap.min.js" integrity="sha384-ux8v3A6CPtOTqOzMKiuo3d/DomGaaClxFYdCu2HPMBEkf6x2xiDyJ7gkXU0MWwaD" crossorigin="anonymous"></script>';
    var css = '<style>body {padding-left: 20px; padding-top:10px; padding-right:20px;} .scrollable-form {height: 300px !important; overflow:auto;}#myUrl {background-color: #e0e0eb; border: 1px solid transparent; border-radius: 4px; padding: 6px 12px; vertical-align: middle; display:inline-block;} .aactive { z-index: 2; color: #ffffff !important; text-decoration: none; background-color: #0275d8; border-color: #0275d8;}</style>';
    var script = "<script>function getUrl() { var elementsCal = document.getElementsByName('cal'); var cals = []; for(var i=0; i<elementsCal.length; i++) { if (elementsCal[i].checked) { cals.push(elementsCal[i].value); } } cals = cals.join('+'); var alarms = []; var elementsAlarm = document.getElementsByName('alarm'); for(var i=0; i<elementsAlarm.length; i++) { if (elementsAlarm[i].checked) { alarms.push(elementsAlarm[i].value); } } alarms = alarms.join('&alarm='); var route = 'webcal://sdmx.herokuapp.com/cal/' + cals ; if (alarms.length > 0) { route = route + '?alarm=' + alarms ; } document.getElementById('myUrl').innerHTML = route; }; $(document).ready(function() { $('.myCheckbox').click(function() { var myElem = $(this).parents('a'); if (myElem.hasClass('aactive')) { myElem.removeClass('aactive'); } else { myElem.addClass('aactive'); } }); });</script>";
    
    var githubRibbon = '<a href="https://github.com/louisdecharson/eviewsSDMX"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>';
    var footer = '</br><hr></hr><font size="2"><p>Credits : <a href="https://github.com/louisdecharson/">https://github.com/louisdecharson/</a></p></font>';
    var jQuery = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>';

    
    var body = '<div class="jumbotron"><h1 class = "display-3">Les dates des publications de l\'Insee dans votre calendrier</h1>';
    body += '<p class="lead">Cette page web vous permet de sélectionner les publications de l\'Insee qui vous intéressent pour créer une alerte dans votre calendrier de leur date de sortie</p></div><hr class="m-y-2">';
    body += '<h4>Comment faire ?</h4>';
    body += '<ul><li>(i) Sélectionnez les publications pour lesquels vous souhaitez créer un événement</li>';
    body += '<li>(ii) Ajoutez une alerte (facultatif) </li>';
    body += '<li>(iii) Créer le calendrier correspondant ou générez une URL vers ce calendrier </li></ul><br>';
    body += '<h4>Sélectionnez les publications : </h4>';
    var form = '<form action="createCal" method="POST"><div class="form-group">';

    vecEv.forEach(function(it,ind) {
        if (ind==0){
            form += '<label class="c-input c-checkbox"><input type="checkbox" name="cal" value="all"><span class="c-indicator"></span><strong> Toutes les publications</strong></label><br><i>ou</i><br><div class="scrollable-form"><div class="list-group">';
        } else {
            form += '<a class="list-group-item anchor" style="height: 30px; padding: 5px 15px;"><label class="c-input c-radio"><input class="myCheckbox" type="checkbox" name="cal" value="'+ it[0] + '"><span class="c-indicator"></span> '+ it[1]  +'</label></a>';
        };
    });
    form += '</div></div>';
    form += '<br><strong>Ajoutez une alarme</strong><br><input type="checkbox" name="alarm" value="15"> 15mn avant<br>';
    form += '<input type="checkbox" name="alarm" value="60"> 1 heure avant<br>';
    form += '<input type="checkbox" name="alarm" value="1440"> 1 jour avant<br>';
    form += '<input type="checkbox" name="alarm" value="2880"> 2 jours avant<br>';
    form += '<br><input type="submit" class="btn btn-primary" name="createCal" value="Créer calendrier">';
    form += ' <input type="button" class="btn btn-success" onclick="getUrl()" value="Obtenir l\'url"></div>';
    form += '<p id="myUrl" class="form-text"></p>';
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + jQuery + header + bootstrap4 + css + script + '</header><body>' + githubRibbon + body + form + footer + '</body>' + '</html>';
    return myHtml;
    
};

// Va chercher la liste des publications
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
    var cals = req.param('cal');
    var alarms = req.param('alarm');
    var route = '';

    if (Array.isArray(cals) && cals.length > 1) {
        cals = cals.join("+");
    };
    if (Array.isArray(alarms) && alarms.length > 1) {
        alarms = alarms.join("&alarm=");
    };
    if (typeof alarms != 'undefined') {
        route = "/cal/" + cals + '?alarm=' + alarms;
    } else {
        route = "/cal/" + cals;
    }
    res.redirect(route);
};


