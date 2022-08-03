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
const gA = "",
      jQuery = '<script src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44="   crossorigin="anonymous"></script>',
      bootstrap = '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>',
      bootstrap4 = '<script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/css/bootstrap.min.css" integrity="sha384-Zug+QiDoJOrZ5t4lssLdxGhVrurbmBWopoEl+M6BdEfwnCJZtKxi1KgxUyJq13dy" crossorigin="anonymous"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.3/js/bootstrap.min.js" integrity="sha384-a5N7Y/aK3qNeh15eJKGWxsqtnX/wWdSZSKp+81YjTmS15nvnvxKHuzaWwXHDli+4" crossorigin="anonymous"></script>',
      listJS = '<script src="//cdnjs.cloudflare.com/ajax/libs/list.js/1.2.0/list.min.js"></script>',
      sdmxCSS = '<link rel="stylesheet" href="/css/sdmx.css"></link>',
      APP_TITLE = '<h1>SDMX in EViews</h1><p><i>Import data in EViews</i></p><a class="btn btn-sm btn-primary" href="/">More details</a><hr/>';



/**
 * Encapsulates a html body into an html document with
 * a header a body
 * @param {string} title
 * @param {string} body
 * @param {string} css
 * @param {string} js
*/
export function encapsulate(title, body, js="", css = "") {
    return `
<!DOCTYPE html>
<html>
<head><title>${title}</title>${css}</head>
<body>${APP_TITLE}
${body}
${js}${sdmxCSS}
</body></html>
    `;
}


/**
 * Removes the "CL_" of the codelist dimension name
 * @param {string} str
*/
function sliceCL(str) {
  if (str.substring(0,3) === "CL_") {
    str = str.slice(3);
    return str;
  } else {
    return str;
  }
}

/**
 * Looks for a string in the keys a dict object
 * @param {string} dict
 * @param {string} str
 * @param {function} callback
*/
function findTitle(dict, str, callback) {
  var myKeys = Object.keys(dict),
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


export function dataFlow(data, service) {
  const title = "SDMX API for EViews / DATAFLOWS ",
        jsForSearch = `${listJS}<script>var options = {valueNames: ['name', 'desc'], searchClass: 'form-control'}; var dataList = new List('myDataflows',options);</script>`;
  let theader = '<th>Id</th><th>Description</th>',
      tbody = '';
  data.forEach(function(item,index){
    tbody += '<tr>';
    tbody += '<td class="name"><a href="/'+ item[4] +'/dataflow/' + item[0]+ '">' + item[0] + '</a>' + '</td>';
    tbody += '<td class="desc">'+ item[3] + '</td>';
    tbody += '</tr>';
  });
  const body = `
    <h2>List of all the datasets of ${service.toUpperCase()}</h2>
    <div id="myDataflows">
      <input class="form-control" placeholder="Search"><br>
      <table class="table table-sm table-hover">
        <thead><tr>${theader}</tr></thead>
        <tbody class="list">${tbody}</tbody>
      </table></div>
  `
  return encapsulate(title, body, jsForSearch);
};

function getTimePeriod(vTS) {
  var vObs = [];
  vTS.forEach(function(item,index) {
    item.Obs.forEach(function(it,ind){
      vObs.push(it.TIME_PERIOD[0]);
    });
  });
  // Delete duplicates in vObs:
  vObs = [...new Set(vObs)];
  // We return a chronological vector of observations:
  return vObs.sort(function(a,b){return parseInt(a.match(/\d/g).join(''))-parseInt(b.match(/\d/g).join(''));});

}

export function makeTable(vTS,title,authParams){
  var header = '<title>SDMX for EViews / '+ title +'</title>';
  var body = '';
  var table ='';
  var theader1 = '<th>Dates</th>';
  var theader2 = '<th>&nbsp;</th>';
  var tbody = '';
  var vInd = new Array(vTS.length).fill(0); // vector of cursors
  var vTsSR = [];
  var vObs = getTimePeriod(vTS);
  if (vTS[0].Obs !== undefined) {
    var vTsSorted = vTS.sort(function(a,b) { return b.Obs.length-a.Obs.length;}); // vector of timeseries
    var nbObs = vObs.length;
    // Check if timeseries are in reverse position :
    var isReverse = false;
    if (vTsSorted[0].Obs.length > 1) {
      var dateFirst = parseInt(vTsSorted[0].Obs[0].TIME_PERIOD[0].match(/\d/g).join('')),
          dateLast = parseInt(vTsSorted[0].Obs[1].TIME_PERIOD[0].match(/\d/g).join(''));
      isReverse = dateFirst > dateLast;
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
  // BODY
  var i = 0;
  while (i < nbObs) {
    tbody += '<tr><td>' + vObs[i].replace('-Q','Q').replace('-S','S').replace('-B','S') + '</td>';
    for(var k=0; k<vTsSR.length; k++) {
      if(vInd[k] < vTsSR[k].length) {
        if(vObs[i] === vTsSR[k][vInd[k]].TIME_PERIOD[0]) {
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
  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + '<table><thead><tr>' + theader1 + '</tr><tr>' + theader2 + '</tr></thead><tbody class="list">' + tbody + '</tbody></table>'+ bootstrap4 + sdmxCSS + gA + '</body></html>';

  return myHtml;
};


export function detailDataset(service,vTS,dataSet,dim,errorDatasetTooBig) {
  var header = '<title>SDMX API for EViews / '+ dataSet +'</title>',
      css = '<style display:none>body {padding-left: 10px; padding-right:10px;}</style>';
  var jsforList = "<script>var options = {valueNames: ['name', 'id'], searchClass: 'form-control'}; var dataList = new List('myTS',options);</script>";

  var body = '<h2>Dataset ' + dataSet  + '</h2><hr class="m-y-2">';
  var button = '<a href="http://sdmx.herokuapp.com/'+ service + '/dataset/' + dataSet +'" class="btn btn-primary" role="button">Download</a>';

  body += '<h3> 1. Dimensions of the data </h3>';
  body += 'Dataset has ' + dim.nbDim + ' dimensions (click on a dimension to see its available values):';
  body += '<ul>';
  dim.data.forEach(function(it,ind) {
    var code = it['LocalRepresentation'][0]['Enumeration'][0]['Ref'][0]['id'][0],
        nomDim = it['id'][0];
    body += '<li><a href=/'+ service + '/codelist/' + code + '?dsdId=' + dim.dsdId +'>' + nomDim + '</a></li>';
  });
  body += '</ul>';
  body += '<h3> 2. List of the timeseries contained in the dataset</h3>';
  var searchBar = '<div id="myTS"><strong>Search: </strong><input class="form-control" placeholder="Search"><br>';

  var theader = '<th>Series Id</th><th>Title</th><th>Last update</th>';
  var tbody = '',
      idSeries = '',
      titleSeries ='',
      lastUpdateSeries = '',
      error = '<p hidden></p>',
      tableDef = '<table class="table table-hover table-sm">';


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
      } else if (item.TITLE_FR != null) {
        titleSeries = item.TITLE_FR[0];
      } else if (item.WIDUKIND_NAME !=null) {
        titleSeries = item.WIDUKIND_NAME[0];
      } else {
        titleSeries = '&nbsp;';
      };
      if (item.LAST_UPDATE != null) {
        lastUpdateSeries = item.LAST_UPDATE[0];
      } else {
        lastUpdateSeries = '&nbsp;';
      };

      tbody += titleSeries + '</td><td>';
      tbody += lastUpdateSeries + '</td></tr>';
    });
  } else {
    error = '<p>ERROR : The app cannot display timeseries because '+ errorDatasetTooBig  +'</p>';
    tableDef = '<table hidden>';
  }


  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header +  css+ '</head><body>' + APP_TITLE + body + error + searchBar  + tableDef + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + listJS + jsforList + gA + jQuery + bootstrap4 + sdmxCSS +  '</body></html>';

  return myHtml;
};

export function codeList(codes,title_dim) {
  var header = '<title>SDMX API for EViews / Codelist for '+ sliceCL(title_dim) +'</title>',
      css = '<style display:none>body {padding-left: 10px;}</style>';

  var body ='',
      table = '',
      theader = '<th>Id</th><th>Description</th>',
      tbody = '<h2>List of codes potentially available for the dimension ' + sliceCL(title_dim)  + '</h2><br/>';


  codes.forEach(function(item,index) {
    tbody += '<tr><td style="min-width:50px">' + item['id'][0]  + '</td>';
    tbody += '<td style="min-width:100px">' + item['Name'][item['Name'].length-1]['_']+'</td></tr>';

  });
  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header  + css + '</head><body>' + APP_TITLE + '<table class="table table-sm table-condensed">' + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + gA + jQuery + bootstrap4 + sdmxCSS + '</body></html>';
  return myHtml;
};

export function List(service,vTS,dataSet,dim) {
  var header = '<title>SDMX API for EViews / '+ dataSet +'</title>',
      css = '<style display:none>body {padding-left: 10px; padding-right:10px;}</style>';
  var jsforList = "<script>var options = {valueNames: ['name', 'id'], searchClass: 'form-control'}; var dataList = new List('myTS',options);</script>";

  var body = '<h1>Dataset ' + dataSet  + '</h1><hr class="m-y-2">';
  body += '<h3> 1. Dimensions of the data </h3>';
  body += 'Dataset has ' + dim.nbDim + ' dimensions (click on a dimension to see its available values):';
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
      idBank = '',
      error = '<p hidden></p>',
      tableDef = '<table class="table table-hover">';

  vTS.forEach(function(item,index) {
    idSeries = dataSet + '.';
    dim.arrDim.forEach(function(it,ind,ar) {
      idSeries += item[it][0];
      if(ind<ar.length-1) {
        idSeries += '.';
      }
    });
    if (item.IDBANK != null) {
      idBank = item.IDBANK[0];
    } else {
      idBank = idSeries;
    }
    tbody += '<tr><td class="id"><a href="/'+service+ '/series/' + idBank + '">' + idSeries +'</a></td><td class="name">';
    if (item.TITLE != null) {
      titleSeries = item.TITLE[0];
    } else if (item.TITLE_COMPL != null) {
      titleSeries = item.TITLE_COMPL[0];
    } else if (item.TITLE_FR != null) {
      titleSeries = item.TITLE_FR[0];
    } else {
      titleSeries = '&nbsp;';
    };
    if (item.LAST_UPDATE != null) {
      lastUpdateSeries = item.LAST_UPDATE[0];
    } else {
      lastUpdateSeries = '&nbsp;';
    };

    tbody += titleSeries + '</td><td>';
    tbody += lastUpdateSeries + '</td></tr>';
  });


  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header +  css+ '</head><body>' + body + error + searchBar  + tableDef + '<thead>'  + '<tr>' + theader + '</tr>' + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + listJS + jsforList + gA + jQuery + bootstrap4 + sdmxCSS + '</body></html>';

  return myHtml;
};


export function makeTableOECD(vTS,title,dataset){
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
      var dateFirst = vTsSorted[0].Obs[0].Time[0],
          dateLast = vTsSorted[0].Obs[1].Time[0];
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
    var monId = dataset;
    vTS[0].SeriesKey[0].Value.forEach(function(it,ind){
      monId += '.'+ it.value[0];
    });
    theader1 += '<th>'+ monId +'</th>';

    // REVERSE THE TIMESERIES TO GET DATE IT THE ASCENDING ORDER
    if (isReverse && nbObs > 0) {
      vTsSR.push(vTsSorted[kk].Obs.reverse()); // sorted vector of timeseries
    } else {
      vTsSR.push(vTsSorted[kk].Obs);
    }
  }
  var i = 0;
  while (i < nbObs) {
    tbody += '<tr><td>' + vTsSR[0][i].Time[0].replace('-Q','Q').replace('-S','S').replace('-B','S') + '</td>';
    tbody += '<td style="text-align:center">' + vTsSR[0][i].ObsValue[0].value + '</td>';
    for(var k=1; k<vTsSR.length; k++) {
      if(vInd[k] < vTsSR[k].length) {
        if(vTsSR[0][i].Time[0] === vTsSR[k][vInd[k]].Time[0]) {
          tbody += '<td style="text-align:center">' + vTsSR[k][vInd[k]].ObsValue[0].value + '</td>';
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
  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + '<table>' + '<thead>'  + '<tr>' + theader1 + '</tr>' + '<tr>' + theader2 + '</tr>'  + '</thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table>' + bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};

export function makeTableBuba(data,cb) {

  var seriesID = data[0].value;
  var header = '<title>SDMX in EViews / Deutsche Bundesbank / '+ seriesID +'</title>',
      body = '',
      table ='',
      myHeader = '<h2>SDMX in EViews </h2><b> Provider: Deutsche Bundesbank</b><br/><b>Series: '+ seriesID +'</b><hr/>',
      tbody = '';

  var theader = '<tr><th>Dates</th><th>' + seriesID  + '</th></tr>';
  theader += '<tr><th></th><th>' + data[1].value  + '</th></tr>';
  data.forEach(function(it,ind) {
    if (ind > 5){
      tbody += '<tr>';
      tbody += '<td style="text-align:center">' + it.date + '</td>';
      tbody += '<td style="text-align:center">' + it.value +'</td>';
      tbody += '</tr>';
    }
  });
  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE  +'<table>' + '<thead>'  + theader + '</thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + bootstrap4 + sdmxCSS + gA + '</body></html>';
  cb(myHtml);
};


export function makeTableFred(arr,nameSeries) {

  var header = '<title>SDMX in EViews / '+ nameSeries +'</title>';
  var body = '';
  var table ='';
  var myHeader = '<h4> FRED for EViews API</h4>',
      theader2 = '<th>Dates</th><th>' + nameSeries  + '</th>';
  var tbody = '';

  arr.forEach(function(it,ind) {
    tbody += '<tr>';
    tbody += '<td style="text-align:center">' + it.date  +'</td>';
    tbody += '<td style="text-align:center">' + it.value  +'</td>';
    tbody += '</tr>';
  });

  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + myHeader  +'<table>' + '<thead>'  + '<tr>' + theader2 +  '</tr></thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};

export function makeTableBLS(series) {
  var data = series.data;
  var header = '<title>SDMX API for EViews / BLS / '+ series.seriesID +'</title>',
      body = '',
      table ='',
      myHeader = '<h4> Bureau of Labor Statistics - '+ series.seriesID +'</h4>',
      theader2 = '',
      tbody = '';

  theader2 += '<th>Dates</th><th>' + series.seriesID  + '</th>';
  data.forEach(function(it,ind) {
    tbody += '<tr>';
    tbody += '<td style="text-align:center">' + it.year + it.period +'</td>';
    tbody += '<td style="text-align:center">' + it.value +'</td>';
    tbody += '</tr>';
  });

  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + myHeader   +'<table>' + '<thead>'  + '<tr>' + theader2 +  '</tr></thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};

export function makeTableQuandl(arr,nameSeries,nameDataset) {

  var header = '<title>SDMX API for EViews / '+ nameDataset +'</title>';
  var body = '';
  var myHeader = '<h4>'+ nameDataset +'</h4>',
      theader2 = '';
  var tbody = '';

  nameSeries.forEach(function(it,ind) {
    theader2 += '<th>' + it  + '</th>';
  });
  arr.forEach(function(it,ind) {
    tbody += '<tr>';
    it.forEach(function(i) {
      tbody += '<td style="text-align:center">' + i  +'</td>';
    });
    tbody += '</tr>';
  });

  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + myHeader  +'<table>' + '<thead>'  + '<tr>' + theader2 +  '</tr></thead>' + '<tbody>' + tbody + '</tbody>'  +'</table>' + bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};

export function OECDDimensions(dim,nameDataset) {
  var header = '<title>SDMX API for EViews / '+ nameDataset +'</title>',
      body = '<h1>Dataset ' + nameDataset  + '</h1><hr class="m-y-2">';
  body += '<h3>Dimensions of the data </h3>',
      body += 'Dataset has ' + dim.length + ' dimensions (click on a dimension to see its available values):',
      body += '<ul>';
  dim.forEach(function(it,ind) {
    body += '<li><a href=/oecd/codelist/' + it.conceptRef + '?Dataset=' + nameDataset +'>' + it.conceptRef + '</a></li>';
  });
  body += '</ul>';
  body += '<hr><div class="alert alert-primary" role="alert"><h4>Build a request</h4>';
  body += '<p>Request for OECD data has the form: <code>/oecd/dataset_code/Dimensions_separated_by_dots</code>.<br/>Note that <ul><li>multiple dimensions can be selected by separated them by a "+".</li><li>Order of dimensions in the URL <strong>do matter</strong>.</li></ul> <br/><strong>Example</strong>: <br/><code>http://sdmx.herokuapp.com/oecd/QNA/AUS+AUT.B1_GE.VOBARSA.Q</code></p></div>';
  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + body + bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};

export function OECDCodeList(codes,codeList,nameDataset) {
  var header = '<title>SDMX API for EViews / '+ nameDataset +'</title>',
      body = '<h4>Available values for dimension '+ codeList + ' in dataset ' + nameDataset  + '</h4><hr class="m-y-2">',
      tbody = '',
      theader = '<th>Code</th><th>Description</th>',
      jsforList = "<script>var options = {valueNames: ['code', 'desc'], searchClass: 'form-control'}; var dataList = new List('myCodesList',options);</script>";

  body += '<div id="myCodesList">';
  body += '<input class="form-control" placeholder="Search"><br>';

  codes.Code.forEach(function(i) {
    tbody += '<tr><td class="code">' + i.value +'</td>';
    tbody += '<td class="desc">' + i.Description[0]['_']  +'</td></tr>';
  });
  var myHtml = '<!DOCTYPE html>' + '<html><head>' + header + '</head><body>' + APP_TITLE + body +'<table class="table table-hover table-sm">' + '<thead>'  + '<tr>' + theader +  '</tr></thead>' + '<tbody class="list">' + tbody + '</tbody>'  +'</table></div>' + listJS + jsforList + jQuery +  bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};


// Function to send when a big dataset has been requested
export function bigDataset(url) {
  var msg = '<div class="alert alert-primary" role="alert">Wait... You have asked to download a big dataset. Your dataset is going to be available for download in a few minutes';
  msg += '<a href="/temp/'+ url +'"> here</a>.</div>';
  var alert = '<div class="alert alert-danger" role="alert"><strong>Important to notice:</strong>This file will only be accessible once. Once downloaded, it will be deleted from our servers. Save it locally.</div>';
  var myHtml = '<!DOCTYPE html>' + '<html><head><title>Big dataset</title></head><body>' + APP_TITLE + msg + alert + jQuery +  bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};
// Function to display an error when a big dataset request has failed
export function bigDatasetError(e) {
  var msg = '<div class="alert alert-danger" role="alert">Your request has not been processed. <br/> Error:';
  msg += e + '</div>';
  var myHtml = '<!DOCTYPE html>' + '<html><head><title>Big dataset</title></head><body>' + APP_TITLE + msg + jQuery +  bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};

// Function to send when the file is not yet available but requested by user.
export function wait(url) {
  var wait = '<div class="alert alert-warning" role="alert"> <strong>The requested file is not available. </strong> If you have just made the request, come back in a few minutes.</div>';
  var myHtml = '<!DOCTYPE html>' + '<html><head><title>Big dataset</title></head><body>' + APP_TITLE +  wait + jQuery +  bootstrap4 + sdmxCSS + gA + '</body></html>';
  return myHtml;
};
