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
 

function buildForm(vecEv) {

    var header = '<title>Calendrier de l\'Insee</title>';
    var bootstrap = '<link rel="stylesheet" href="https://cdn.rawgit.com/twbs/bootstrap/v4-dev/dist/css/bootstrap.css" integrity="sha384-XXXXXXXX" crossorigin="anonymous"><script src="https://cdn.rawgit.com/twbs/bootstrap/v4-dev/dist/js/bootstrap.js" integrity="sha384-XXXXXXXX" crossorigin="anonymous"></script>';
    var css = '<style>h2,form,p {margin-left:10px;} input[type=submit]{width: 10em; font-size: 15px; padding: 6px 12px; vertical-align: middle; color: #fff; background-color: #337ab7; border-color: #2e6da4; border: 1px solid transparent; border-radius: 4px;} input[type=button]{width: 10em; font-size: 15px; padding: 6px 12px; vertical-align: middle; color: #fff; background-color: #669999; border-color: #2e6da4; border: 1px solid transparent; border-radius: 4px;} #myUrl {background-color: #e0e0eb; border: 1px solid transparent; border-radius: 4px; padding: 6px 12px; vertical-align: middle; display:inline-block;}</style>';
    var script = "<script>function getUrl() { var elementsCal = document.getElementsByName('cal'); var cals = []; for(var i=0; i<elementsCal.length; i++) { if (elementsCal[i].checked) { cals.push(elementsCal[i].value); } } cals = cals.join('+'); var alarms = []; var elementsAlarm = document.getElementsByName('alarm'); for(var i=0; i<elementsAlarm.length; i++) { if (elementsAlarm[i].checked) { alarms.push(elementsAlarm[i].value); } } alarms = alarms.join('&alarm='); var route = 'webcal://sdmx.herokuapp.com/cal/' + cals ; if (alarms.length > 0) { route = route + '?alarm=' + alarms ; } document.getElementById('myUrl').innerHTML = route; }</script>";
    
    var githubRibbon = '<a href="https://github.com/louisdecharson/eviewsSDMX"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_red_aa0000.png"></a>';
    var footer = '</br><hr></hr><font size="2"><p>Credits : <a href="https://github.com/louisdecharson/">https://github.com/louisdecharson/</a></p></font>';
    

    
    var body = '<h2>Importez les dates des publications de l\'Insee dans votre calendrier</h2>';
    body += '<ul><li>(i) Sélectionnez les publications pour lesquels vous souhaitez créer un événement</li>';
    body += '<li>(ii) Ajoutez une alerte (facultatif) </li>';
    body += '<li>(iii) Créer le calendrier correspondant ou générez une URL vers ce calendrier </li></ul>';
    body += '<strong>Sélectionnez les publications : </strong><br>';
    var form = '<form action="createCal" method="POST">';

    vecEv.forEach(function(it,ind) {
        if (ind==0){
            form += '<input type="checkbox" name="cal" value="all"><strong>Tous les événements</strong><br><i>ou</i><br>';
        } else {
            form += '<input type="checkbox" name="cal" value="'+ it[0] + '"> '+ it[1]  +'<br>';
        };
    });
    form += '<br><strong>Ajoutez une alarme</strong><br><input type="checkbox" name="alarm" value="15"> 15mn avant<br>';
    form += '<input type="checkbox" name="alarm" value="60"> 1 heure avant<br>';
    form += '<input type="checkbox" name="alarm" value="1440"> 1 jour avant<br>';
    form += '<input type="checkbox" name="alarm" value="2880"> 2 jours avant<br>';
    form += '<br><input type="submit" name="createCal" value="Créer calendrier">';
    form += ' <input type="button" onclick="getUrl()" value="Obtenir l\'url"></form>';
    form += '<p id="myUrl"></p>';
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + css + script + '</header><body>' + githubRibbon + body + form + footer + '</body></html>';
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


