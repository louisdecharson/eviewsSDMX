
// mini-function used to remove 'CL_' to the name of a dimension when retrieving codelist.
function sliceCL(str) {
    if (str.substring(0,3) == "CL_") {
        str = str.slice(3);
        return str;
    } else {
        return str;
    }
}


exports.dataFlow = function(data,service) {
    var header = '<title>SDMX API for EViews / DATAFLOWS </title>',
        bootstrap = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>',
        css = '<style display:none>body {padding-left: 10px;}</style>';
    var body = '<h2>List of all the datasets of '+ service.toUpperCase() + '</h2><hr class="m-y-2">',
        table = '',
        theader = '<th>Id</th><th>Description</th>',
        tbody = '';
    
    data.forEach(function(item,index){
        tbody += '<tr><td><a href="/'+ item[4] +'/dataflow/' + item[0]+ '">' + item[0] + '</a>' + '</td><td>';
        tbody += item[3] + '</td>';
    });

    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + bootstrap + css +'</header><body>' + body + '<table class="table table-condensed table-hover">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
}; 


exports.makeTable = function(vTS,title,authParams){
    var header = '<title>SDMX API for EViews / '+ title +'</title>';
    var body = '';
    var table ='';
    var theader1 = '<th>Dates</th>';
    var theader2 = '<th>&nbsp;</th>';
    var tbody = '';
    var vTsSorted = vTS.sort(function(a,b) { return b.Obs.length-a.Obs.length;}); // vector of timeseries
    var nbObs = vTsSorted[0].Obs.length;
    var vInd = new Array(vTS.length).fill(0); // vector of cursors

    var vTsSR = [];

    // Check if timeseries are in reverse position :
    var isReverse = false;
    if (vTsSorted[0].Obs.length > 0) {
        var dateFirst = vTsSorted[0].Obs[0].TIME_PERIOD[0],
            dateLast = vTsSorted[0].Obs[1].TIME_PERIOD[0];
        if (dateFirst.substring(0,4) > dateLast.substring(0,4)) {
            isReverse = true;
        } else if (dateFirst.slice(-1) > dateLast.slice(-1)) {
            isReverse = true;
        }
    }
    // HEADER 
    for(var kk=0; kk<vTsSorted.length; kk++) {
        if (vTsSorted[kk].IDBANK != null) {
            theader1 += '<th>' + vTsSorted[kk].IDBANK[0] + '</th>';
        } else { // on construit un nom à partir des paramètres.
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
        };
        var montitre = '';
        if (vTsSorted[kk].TITLE != null){
            montitre = vTsSorted[kk].TITLE[0];
        } else if (vTsSorted[kk].TITLE_COMPL != null) {
            montitre = vTsSorted[kk].TITLE_COMPL[0];
        } else {
            montitre = '&nbsp;';
        }
        theader2 += '<th>' + montitre + '</th>';
        if (isReverse) {
            vTsSR.push(vTsSorted[kk].Obs.reverse()); // sorted vector of timeseries
        } else {
            vTsSR.push(vTsSorted[kk].Obs);
        }
    }
    
    // BODY
    var i = 0;

    while (i < nbObs) {
        // tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0] + '</td>';
        tbody += '<tr><td>' + vTsSR[0][i].TIME_PERIOD[0].replace('-Q','Q') + '</td>';
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
};


exports.detailDataset = function(service,vTS,dataSet,arr,errorDatasetTooBig) {
    var header = '<title>SDMX API for EViews / '+ dataSet +'</title>',
        bootstrap = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>',
        css = '<style display:none>body {padding-left: 10px;}</style>';
    var body = '<h1>Dataset ' + dataSet  + '</h1><hr class="m-y-2">';
    body += '<h3> 1. Dimensions of the data </h3>';
    body += 'Dataset has ' + arr[0] + ' dimensions :';
    body += '<ul>';
    arr[2].forEach(function(it,ind) {
        var code = it['LocalRepresentation'][0]['Enumeration'][0]['Ref'][0]['id'][0],
            nomDim = it['id'][0];
        body += '<li><a href=/'+ service + '/codelist/' + code + '>' + nomDim + '</a></li>';
    });
    body += '</ul>';
    body += '<h3> 2. List of the timeseries contained in the dataset</h3>';
    
    var table ='';
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
                arr[1].forEach(function(it,ind,ar) {
                    idSeries += item[it][0];
                    if(ind<ar.length-1) {
                        idSeries += '.';
                    }
                });
            }
            tbody += '<tr><td><a href="/'+service+ '/series/' + idSeries + '">' + idSeries +'</a></td><td>';
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
                 
    
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + bootstrap + css+ '</header><body>' + body + error + tableDef + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    
    return myHtml;
};


exports.codeList = function (codes,title_dim) {   
    var header = '<title>SDMX API for EViews / Codelist for '+ sliceCL(title_dim) +'</title>',
        bootstrap = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>',
        css = '<style display:none>body {padding-left: 10px;}</style>';
         
    var body ='',
        table = '',
        theader = '<th>Id</th><th>Description</th>',
        tbody = '<h2>List of codes potentially available for the dimension ' + sliceCL(title_dim)  + '</h2><hr class="m-y-2">';


    codes.forEach(function(item,index) {
        tbody += '<tr><td style="min-width:50px">' + item['id'][0]  + '</td>';
        tbody += '<td style="min-width:100px">' + item['Name'][item['Name'].length-1]['_']+'</td></tr>';
        
    });
    var myHtml = '<!DOCTYPE html>' + '<html><header>' + header + bootstrap + css + '</header><body>' + '<table class="table table-hover table-condensed">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + '</body></html>';
    return myHtml;
};

