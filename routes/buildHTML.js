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
// =====================================================================


// CONSTANTS
const gA = "<script> (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){ (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o), m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); ga('create', 'UA-92058229-1', 'auto'); ga('send', 'pageview');</script>",
      jQuery = '<script src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44="   crossorigin="anonymous"></script>',
      bootstrap = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>',
      listJS = '<script src="//cdnjs.cloudflare.com/ajax/libs/list.js/1.2.0/list.min.js"></script>';

 
   

// mini-function used to remove 'CL_' to the name of a dimension when retrieving codelist.
function sliceCL(str) {
    if (str.substring(0,3) === "CL_") {
        str = str.slice(3);
        return str;
    } else {
        return str;
    }
}

// mini-function that look in a JSON object for an id or title
function findTitle(json,str,callback) {
    var myKeys = Object.keys(json),
        result = -1,
        k = 0,
        it = '';
    while (k<myKeys.length && result === -1) {
        it = myKeys[k];
        result = it.indexOf(str);
        k ++;
    }
    if (result > -1) {
        callback(it);
    } else {
        callback(null);
    }
};


exports.dataFlow = function(data,service) {
    var header = '<title>SDMX API for EViews / DATAFLOWS </title>',
        css = '<style display:none>body {padding-left: 10px; padding-right: 10px; } </style>';
    var jsforList = "<script>var options = {valueNames: ['name', 'desc'], searchClass: 'form-control'}; var dataList = new List('myDataflows',options);</script>";
   
    var body = '<h2>List of all the datasets of '+ service.toUpperCase() + '</h2><hr class="m-y-2">',
        theader = '<th>Id</th><th>Description</th>',
        tbody = '';

    body += '<div id="myDataflows">';
    body += '<input class="form-control" placeholder="Search"><br>';
    
    data.forEach(function(item,index){
        tbody += '<tr>';
        tbody += '<td class="name"><a href="/'+ item[4] +'/dataflow/' + item[0]+ '">' + item[0] + '</a>' + '</td>';
        tbody += '<td class="desc">'+ item[3] + '</td>';
        tbody += '</tr>';
    });
    var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + css + '</head><body>' + body + '<table class="table table-condensed table-hover">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + listJS  + jsforList + gA + jQuery + bootstrap +'</body></html>';
    return myHtml;
};


exports.makeTable = function(vTS,title,authParams){
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th>';
    var theader2 = '<th>&nbsp;</th>';
    var tbody = '';
    var vInd = new Array(vTS.length).fill(0); // vector of cursors
    var vTsSR = [];
    if (vTS[0].Obs !== undefined) {
        var vTsSorted = vTS.sort(function(a,b) { return b.Obs.length-a.Obs.length;}); // vector of timeseries
        var nbObs = vTsSorted[0].Obs.length;
        // Check if timeseries are in reverse position :
        var isReverse = false;
        if (vTsSorted[0].Obs.length > 1) {
            var dateFirst = vTsSorted[0].Obs[0].TIME_PERIOD[0],
                dateLast = vTsSorted[0].Obs[1].TIME_PERIOD[0];
            if (dateFirst.substring(0,4) > dateLast.substring(0,4)) {
                isReverse = true;
            } else if (dateFirst.slice(-1) > dateLast.slice(-1)) {
                isReverse = true;
            }
        }
    } else {
        var vTsSorted = vTS,
            nbObs = 0,
            isReverse = false;
    }

    // HEADER
    for(var kk=0; kk<vTsSorted.length; kk++) {

        // GET AN ID FOR THE TIMESERIES
        findTitle(vTsSorted[kk],'ID', function(res) {
            if (res != null) { // un parametre contient ID on l'utilise comme ID
                theader1 += '<th>' + vTsSorted[kk][res][0] + '</th>';
            } else { // aucun param ne contient ID, on le constitue a partir du nom de la page qui est l'identifiant de la serie
                var monId = title;
                if (authParams.length > 0) {
                    monId += '.';
                    authParams.forEach(function(it,ind,arr) {
                        if (ind<arr.length-1) {
                            monId += vTsSorted[kk][it][0]+'.';
                        } else {
                            monId +=vTsSorted[kk][it][0];
                        };
                    });
                }
                theader1 += '<th>'+monId+'</th>'; 
            }
        });

        // GET A TITLE OR DESCRIPTION FOR THE TIMESERIES
        var montitre = '';
        findTitle(vTsSorted[kk],'TITLE', function(res) {
            if (res != null) {
                montitre = vTsSorted[kk][res][0];
            } else {
                findTitle(vTsSorted[kk],'NAME',function(res) {
                    if (res !=null) {
                        montitre = vTsSorted[kk][res][0];
                    } else {
                        montitre = '&nbsp;';
                    }
                });
            }
        });
        theader2 += '<th>' + montitre + '</th>';

        // REVERSE THE TIMESERIES TO GET DATE IT THE ASCENDING ORDER
        if (isReverse && nbObs > 0) {
            vTsSR.push(vTsSorted[kk].Obs.reverse()); // sorted vector of timeseries
        } else {
            vTsSR.push(vTsSorted[kk].Obs);
        }
    }    
    
    // for(var kk=0; kk<vTsSorted.length; kk++) {
    //     if (vTsSorted[kk].IDBANK != null) {
    //         theader1 += '<th>' + vTsSorted[kk].IDBANK[0] + '</th>';
    //     } else {      // on construit un nom à partir des paramètres.
    //         var monId = title;
    //         if (authParams.length > 0) {
    //             monId += '.';
    //             authParams.forEach(function(it,ind,arr) {
    //                 if (ind<arr.length-1) {
    //                     monId += vTsSorted[kk][it][0]+'.';
    //                 } else {
    //                     monId +=vTsSorted[kk][it][0];
    //                 };
    //             });
    //         }
    //         theader1 += '<th>'+monId+'</th>';
    //     };
    //     var montitre = '';
    //     if (vTsSorted[kk].TITLE != null){
    //         montitre = vTsSorted[kk].TITLE[0];
    //     } else if (vTsSorted[kk].TITLE_COMPL != null) {
    //         montitre = vTsSorted[kk].TITLE_COMPL[0];
    //     } else {
    //         montitre = '&nbsp;';
    //     }
    //     theader2 += '<th>' + montitre + '</th>';
    //     if (isReverse) {
    //         vTsSR.push(vTsSorted[kk].Obs.reverse()); // sorted vector of timeseries
    //     } else {
    //         vTsSR.push(vTsSorted[kk].Obs);
    //     }
    // }
    
    // BODY
    var i = 0;

    while (i < nbObs) {
        // tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0] + '</td>';
        tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0].replace('-Q','Q').replace('-S','S').replace('-B','S') + '</td>';
        tbody += '<td style="text-align:center">' + vTsSR[0][i].OBS_VALUE[0] + '</td>';
        for(var k=1; k<vTsSR.length; k++) {
            if(vInd[k] < vTsSR[k].length) {
                if(vTsSR[0][i].TIME_PERIOD[0] === vTsSR[k][vInd[k]].TIME_PERIOD[0]) {
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
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + '</header><body>' + '<table>' + '<thead>'  + '<tr>' + theader1 + '</tr>' + '<tr>' + theader2 + '</tr>'  + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table>' + gA + '</body></html>';
    
    return myHtml;
};


exports.detailDataset = function(service,vTS,dataSet,dim,errorDatasetTooBig) {
    var header = '<title>SDMX API for EViews / '+ dataSet +'</title>',
        css = '<style display:none>body {padding-left: 10px; padding-right:10px;}</style>';
    var jsforList = "<script>var options = {valueNames: ['name', 'id'], searchClass: 'form-control'}; var dataList = new List('myTS',options);</script>";
    
    var body = '<h1>Dataset ' + dataSet  + '</h1><hr class="m-y-2">';
    var button = '<a href="http://sdmx.herokuapp.com/'+ service + '/dataset/' + dataSet +'" class="btn btn-primary" role="button">Download</a>';
    
    body += button;
    body += '<h3> 1. Dimensions of the data </h3>';
    body += 'Dataset has ' + dim.nbDim + ' dimensions :';
    body += '<ul>';
    dim.data.forEach(function(it,ind) {
        var code = it['LocalRepresentation'][0]['Enumeration'][0]['Ref'][0]['id'][0],
            nomDim = it['id'][0];
        body += '<li><a href=/'+ service + '/codelist/' + code + '?dsdId=' + dim.dsdId +'>' + nomDim + '</a></li>';
    });
    body += '</ul>';
    body += '<h3> 2. List of the timeseries contained in the dataset</h3>';
    var searchBar = '<div id="myTS"><input class="form-control" placeholder="Search"><br>';
    
    var theader = '<th>Series Id</th><th>Title</th><th>Last update</th>';
    var tbody = '',
        idSeries = '',
        titleSeries ='',
        lastUpdateSeries = '',
        error = '<p hidden></p>',
        tableDef = '<table class="table table-hover">';
    
    
    if (errorDatasetTooBig == null) {
        vTS.forEach(function(item,index){
            if (item.IDBANK != null) {
                idSeries = item.IDBANK[0];
            } else {
                idSeries = dataSet + '.';
                dim.arrDim.forEach(function(it,ind,ar) {
                    idSeries += item[it][0];
                    if(ind<ar.length-1) {
                        idSeries += '.';
                    }
                });
            }
            tbody += '<tr><td class="id"><a href="/'+service+ '/series/' + idSeries + '">' + idSeries +'</a></td><td class="name">';
            if (item.TITLE != null) {
                titleSeries = item.TITLE[0];
            } else if (item.TITLE_COMPL != null) {
                titleSeries = item.TITLE_COMPL[0];
            } else {
                titleSeries = '&nbsp;';
            };
            if (item.LAST_UPDATE != null) {
                lastUpdateSeries = item.LAST_UPDATE[0];
            } else {
                lastUpdateSeries = '&nbsp;';
            };
            
            tbody += titleSeries + '</td><td>';
            tbody += lastUpdateSeries + '</td><td>';
        });
    } else {
        error = '<p>ERROR : The app cannot display timeseries because '+ errorDatasetTooBig  +'</p>';
        tableDef = '<table hidden>';
    }
                 
    
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header +  css+ '</header><body>' + body + error + searchBar  + tableDef + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + listJS + jsforList + gA + jQuery + bootstrap + '</body></html>';
    
    return myHtml;
};


exports.codeList = function (codes,title_dim) {   
    var header = '<title>SDMX API for EViews / Codelist for '+ sliceCL(title_dim) +'</title>',
        css = '<style display:none>body {padding-left: 10px;}</style>';
         
    var body ='',
        table = '',
        theader = '<th>Id</th><th>Description</th>',
        tbody = '<h2>List of codes potentially available for the dimension ' + sliceCL(title_dim)  + '</h2><hr class="m-y-2">';


    codes.forEach(function(item,index) {
        tbody += '<tr><td style="min-width:50px">' + item['id'][0]  + '</td>';
        tbody += '<td style="min-width:100px">' + item['Name'][item['Name'].length-1]['_']+'</td></tr>';
        
    });
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header  + css + '</header><body>' + '<table class="table table-hover table-condensed">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + gA + jQuery + bootstrap + '</body></html>';
    return myHtml;
};

exports.listProviders = function(providers) {
    var header = '<title> SDMX API for EViews / supported providers</title>',
        css = '<style display:none>body {padding-left: 5%; padding-right: 5%; } </style>',
        body = '<h2>Supported Providers</h2>',
        theader = '<th>Id</th><th>Website</th><th style="text-align:center">SDMX</th><th style="text-align:center">API Key</th>',
        tbody = '';
    Object.keys(providers).forEach(function(item,index){
        tbody += '<tr>';
        tbody += '<td>' + item + '</td>';
        tbody += '<td><a href="http://' + providers[item].host + '/">' + providers[item].host + '</a></td>';
        if (providers[item].apiKey === 'True') {
            tbody += '<td style="text-align:center">&#10006;</td><td style="text-align:center">&#10004;</td>';
        } else {
            tbody += '<td style="text-align:center">&#10004;</td><td style="text-align:center">&#10006;</td>';
        }
        tbody += '</tr>';
    });
    var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + css + '</head><body>' + body + '<hr/><table class="table table-condensed table-hover">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + gA + jQuery + bootstrap +'</body></html>';
    return myHtml;
};
