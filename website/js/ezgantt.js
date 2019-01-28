/* globals gapi, google, login */
/*jshint esversion: 6 */
/*jshint unused:true */

// Helper functions
let daysToMilliseconds = days => {
    return parseInt(days, 10) * 24 * 60 * 60 * 1000;
  },
  strToMS = str => {
    switch (str.slice(-1)) {
      case 'w':
        return daysToMilliseconds(str) * 7;
      case 'm':
        return daysToMilliseconds(str) * 7 * 4;
      case 'q':
        return daysToMilliseconds(str) * 7 * 4 * 3;
      case 'd':
      /* falls through */
      default:
        return daysToMilliseconds(str);
    }
  };

const
  IS_PUBLIC = window.location.toString().includes('appspot'),
  API_KEY = IS_PUBLIC ? 'AIzaSyCyU_k4F1RM-fmoXyhUcEpvTkcWtP40aJA' : 'AIzaSyAw0yf380IIJSDJeuDhJjWgYIO0ma6ZCbg',
  CLIENT_ID = IS_PUBLIC ? '906125590321-j0kts6f34vu2f70fih84g5c9udm684ok.apps.googleusercontent.com' : '918743316759-e79mcr3rks3t8291qopi82qb9i8ht5l8.apps.googleusercontent.com',
  PUBLIC_PRIVATE_DOC = ['1kYfoEFXW-psZ8AMy0Ne7wRMiM3umNKBs3v9U7nvafXA', '1ZkDfbfj3G_CONE22ap82dpgnOxQ9L33CQ5K74ZVPzrA'],
  APIS = [{
    'gapi': 'spreadsheets',
    'discovery': 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    'scopes': ['https://www.googleapis.com/auth/spreadsheets.readonly']
  }, {
    'gapi': 'drive',
    'discovery': 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    'scopes': [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ]
  }, {
    'chart': 'gantt'
  }];

if (!IS_PUBLIC) {
  let anchors = document.getElementsByTagName("a");
  for (let i = 0; i < anchors.length; i++) {
    anchors[i].href = anchors[i].href.replace(PUBLIC_PRIVATE_DOC[0], PUBLIC_PRIVATE_DOC[1]);
  }
}

login(API_KEY, CLIENT_ID, APIS).then(() => {
  console.log('Login finished, starting app init.');
  return new Promise(resolve => {
    let initFunction = () => {
      let hash = location.hash.replace('#', '').replace(/[?&].*/, '');
      if (hash) {
        document.getElementById('sheet').setAttribute('href', 'https://docs.google.com/spreadsheets/d/' + hash + '/edit');
        resolve(hash);
      } else {
        document.getElementById('instructions-dialog').showModal();
        // reject(); Never reject, never resolve.
      }
    };

    if (document.readyState === 'complete') {
      initFunction();
    } else {
      document.addEventListener("DOMContentLoaded", initFunction);
    }
  });
}).then(sheetId => {
  console.log('readGanttData', sheetId);
  return gapi.client.sheets.spreadsheets.get({
    'spreadsheetId': sheetId,
    'includeGridData': true,
    // Gets excess data from other tabs, but removes a round trip.  
    'fields': 'properties/title,sheets(properties(sheetId,title,gridProperties),data(rowData(values(formattedValue))))'
  });
}).then(resp => {
  let spreadsheet = resp.result;
  console.log('spreadsheet', spreadsheet);
  document.getElementById('pageTitle').innerHTML = spreadsheet.properties.title;
  // console.log('Found ' + spreadsheet.sheets.length + ' worksheets.');
  return spreadsheet.sheets.find(sheet => sheet.properties.title.toLowerCase().includes('gantt'));
}).then(sheet => {
  if (!sheet) {
    Promise.reject('Unable to find worksheet with "gantt" in the name.');
  }
  // console.log('displayGantt sheet', sheet);

  // take a table's first header row and use it as object property names
  let rowData = sheet.data[0].rowData,
    result = [];
  for (let rowNum = 1; rowNum < rowData.length; rowNum++) {
    let
      newRow = {},
      newRowHasData = false;

    for (let colNum = 0; rowData[rowNum] &&
    rowData[rowNum].values &&
    colNum < rowData[rowNum].values.length; colNum++) {
      let headerName = rowData[0].values[colNum].formattedValue.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (rowData[rowNum].values[colNum] &&
        (typeof rowData[rowNum].values[colNum].formattedValue !== 'undefined')) {
        // Leave empty values missing, everything else is a string.
        newRow[headerName] = '' + rowData[rowNum].values[colNum].formattedValue;
        newRowHasData = true;
      }
    }
    if (newRowHasData) {
      result.push(newRow);
    }
  }
  return result;
}).then(rows => {
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

  let allRows = [],
    ids = {};
  rows.filter(row => row.taskid).forEach(row => {

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

    // Start (slash hack for local timezone)
    rowData.push(row.startdate ? new Date(row.startdate.replace(/-/g, '/')) : null);

    // End (slash hack for local timezone)
    rowData.push(row.enddate ? new Date(row.enddate.replace(/-/g, '/')) : null);

    if (row.startdate && row.enddate && (new Date(row.startdate)) > (new Date(row.enddate))) {
      alert('Illogical, start date later than end date for id:' + id);
    }

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
  allRows.filter(row => row.dependencies).forEach(row => {
    row.dependencies.split(',').forEach(dep => {
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
}).catch(error => {
  console.error("General Error", error);
  alert('App error, see console.');
});

// TODO: Set up listeners
/*
google.visualization.events.addListener(chart, 'click', targetId => {
  console.log('Clicked on:' + targetId);
});

google.visualization.events.addListener(chart, 'select', () => {
  console.log(JSON.stringify(chart.getSelection()));    
});
*/