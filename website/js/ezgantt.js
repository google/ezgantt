/* globals gapi, google, authAndLoadPromise */
/*jshint esversion: 6 */
/*jshint unused:true */
// Override promise.js dialog box.
window.promiseButtonText = "Authorize VIEW-ONLY access to your Spreadsheets to read the gantt chart's data.\n" +
  "This app is stateless and does not store any information.";

const 
  API_KEY='AIzaSyCyU_k4F1RM-fmoXyhUcEpvTkcWtP40aJA',
  CLIENT_ID='906125590321-j0kts6f34vu2f70fih84g5c9udm684ok.apps.googleusercontent.com';

authAndLoadPromise(API_KEY, CLIENT_ID, ['drive', 'spreadsheets', 'gantt']).then(function () {
  console.log('PLEDGE FINISHED, starting app init.');
  return new Promise(function (resolve, reject) {
    let initFunction = function () {
      let helpDialog = document.getElementById('instructions-dialog');

      document.getElementById('close-instructions').onclick = function () {
        if (helpDialog.open) {
          helpDialog.close();
        }
      };

      let hash = location.hash.replace('#', '');
      if (!hash) {
        helpDialog.showModal();
        reject();
      }
      document.getElementById('sheet').setAttribute('href', 'https://docs.google.com/spreadsheets/d/' + hash + '/edit');
      resolve(hash);
    };
    
    if(document.readyState === 'complete') {
      initFunction();
    } else {
      document.addEventListener("DOMContentLoaded", initFunction);
    }
  });
}).then(function (sheetId) {
  console.log('readGanttData', sheetId);
  return gapi.client.sheets.spreadsheets.get({
    'spreadsheetId': sheetId,
    'includeGridData': true,
    // Gets excess data from other tabs, but removes a round trip.  
    'fields': 'properties/title,sheets(properties(sheetId,title,gridProperties),data(rowData(values(formattedValue))))'
  });
}).then(function (resp) {
  let spreadsheet = resp.result;
  console.log('spreadsheet', spreadsheet);
  document.getElementById('pageTitle').innerHTML = spreadsheet.properties.title;
  // console.log('Found ' + spreadsheet.sheets.length + ' worksheets.');
  return spreadsheet.sheets.find(function (sheet) {
    return sheet.properties.title.toLowerCase().includes('gantt');
  });
}).then(function (sheet) {
  if (!sheet) {
    Promise.reject('Unable to find worksheet with "gantt" in the name.');
  }
  // console.log('displayGantt sheet', sheet);
  
  // take a table's first header row and use it as object property names
  let rowData = sheet.data[0].rowData, 
    result = [];
  for (let rowNum = 1; rowNum < rowData.length; rowNum++) {
    let newRow = {};
    for (let colNum = 0; colNum < rowData[rowNum].values.length; colNum++) {
      let headerName = rowData[0].values[colNum].formattedValue.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if(rowData[rowNum].values[colNum] &&
        (typeof rowData[rowNum].values[colNum].formattedValue !== "undefined")) {
        // Leave empty values missing, everything else is a string.
        newRow[headerName] = '' + rowData[rowNum].values[colNum].formattedValue;
      }
    }
    result.push(newRow);
  }
  return result;
}).then(function(rows) {
  // console.log('displayGantt converted rows', rows);
  
  let data = new google.visualization.DataTable();
  data.addColumn('string', 'Task ID');
  data.addColumn('string', 'Task Name');
  data.addColumn('string', 'Resource');
  data.addColumn('date', 'Start Date');
  data.addColumn('date', 'End Date');
  data.addColumn('number', 'Duration');
  data.addColumn('number', 'Percent Complete');
  data.addColumn('string', 'Dependencies');

  let allRows = [], ids = {};
  rows.forEach(function (row) {
    
    let rowData = [];
    // ID
    let id = row.taskid.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (ids[id]) {
      alert('Duplicate task id:' + id);
    }
    ids[id] = true;
    rowData.push(id);

    if (row.taskname && row.taskname.startsWith('#')) {
      console.log('Skipping row ' + id + ' with name:' + row.taskname);
      return;
    }

    // Name
    rowData.push(row.taskname);

    // Resource
    rowData.push(row.resource ? row.resource.toLowerCase().trim() : null);

    // Start
    rowData.push(row.startdate ? new Date(row.startdate) : null);

    // End
    rowData.push(row.enddate ? new Date(row.enddate) : null);

    // Duration
    rowData.push(row.duration ? strToMS(row.duration) : null);

    // Percent
    rowData.push(row.percentcomplete ? (+row.percentcomplete.replace(/\D/g, '')) : 0);

    // Dependencies
    rowData.push(row.dependencies ? row.dependencies.toLowerCase().replace(/[^a-z0-9,]/g, '') : null);

    console.log('id,name,resource,start,end,dur,pct,dep', rowData);
    allRows.push(rowData);
  });

  // Check for missing dependencies that would break the chart.
  allRows.filter(function(row){
    return row.dependencies;
  }).forEach(function (row) {
    row.dependencies.split(',').forEach(function (dep) {
      let dep2 = dep.trim();
      if (dep2 && !ids[dep2]) {
        alert('Task:' + row.id + ' is missing dependency:' + dep2);
      }
    });
  });

  data.addRows(allRows);

  let options = {
    gantt: {
      trackHeight: 30,
      defaultStartDateMillis: new Date(),
      criticalPathEnabled: true,
      criticalPathStyle: {
        stroke: '#e64a19',
        strokeWidth: 5
      }
    }
  };

  console.log('Drawing chart');
  let chart = new google.visualization.Gantt(document.getElementById('chart_div'));
  chart.draw(data, options);
}).catch(function (error) {
  console.error("General Error", error);
  alert('App error, see console.');
});

function daysToMilliseconds(days) {
  return parseInt(days, 10) * 24 * 60 * 60 * 1000;
}

function strToMS(str) {
  switch (str.slice(-1)) {
  case 'w':
    return daysToMilliseconds(str) * 7;
  case 'm':
    return daysToMilliseconds(str) * 7 * 4;
  case 'q':
    return daysToMilliseconds(str) * 7 * 4 * 3;
  case 'd':
    // fall through
  default:
    return daysToMilliseconds(str);
  }
}


// TODO: Set up listeners
/*
google.visualization.events.addListener(chart, 'click', function(targetId) {
  console.log('Clicked on:' + targetId);
});

google.visualization.events.addListener(chart, 'select', function() {
  console.log(JSON.stringify(chart.getSelection()));    
});
*/