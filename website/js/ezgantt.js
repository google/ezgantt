/* globals gapi, google, authAndLoadPromise */
/*jshint esversion: 6 */
/*jshint unused:true */
// Override promise.js dialog box.
window.promiseButtonText = "Authorize VIEW-ONLY access to your gantt chart's data.<br>" +
  "This app is stateless and does not store any information.";

authAndLoadPromise(
  'AIzaSyCpfGYM9oV1BLtrV3g8XZ3bd23xKSgULFY',
  '906125590321-2q2cm28jkj4jh19on1o0pv64b1mbh29g.apps.googleusercontent.com', ['drive', 'spreadsheets']
).then(function () {
  return new Promise(function (resolve, reject) {
    document.addEventListener("DOMContentLoaded", function () {
      console.log('DOMContentLoaded');
      var helpDialog = document.getElementById('instructions-dialog');

      document.getElementById('close-instructions').onclick = function () {
        if (helpDialog.open) {
          helpDialog.close();
        }
      };

      var hash = location.hash.replace('#', '');
      if (!hash) {
        helpDialog.showModal();
        reject();
      }
      document.getElementById('sheet').setAttribute('href', 'https://docs.google.com/spreadsheets/d/' + hash + '/edit');
      resolve(hash);
    });
  });
}).then(function (sheetId) {
  console.log('readGanttData', sheetId);
  return gapi.client.sheets.spreadsheets.get({
    'spreadsheetId': sheetId,
    'includeGridData': false,
    'fields': 'properties/title,sheets(properties/sheetId,properties/title)'
  });
}).then(function (spreadsheet) {
  document.getElementById('pageTitle').innerHTML = spreadsheet.properties.title;
  console.log('Found ' + spreadsheet.sheets.length + ' worksheets.');
  return spreadsheet.sheets.find(function (sheet) {
    return sheet.properties.title.toLowerCase().contains('gantt');
  });
}).then(function (sheet) {
  if (!sheet) {
    Promise.reject('Unable to find worksheet with "gantt" in the name.');
  }
  return gapi.client.sheets.spreadsheets.values.get({
    'spreadsheetId': sheet.properties.sheetId,
    'range': 'A:I'
  });
}).then(function (valueRange) {
  console.log('displayGantt');

  console.log(valueRange.values);
  var data = new google.visualization.DataTable();
  data.addColumn('string', 'Task ID');
  data.addColumn('string', 'Task Name');
  data.addColumn('string', 'Resource');
  data.addColumn('date', 'Start Date');
  data.addColumn('date', 'End Date');
  data.addColumn('number', 'Duration');
  data.addColumn('number', 'Percent Complete');
  data.addColumn('string', 'Dependencies');

  var allRows = [];
  var ids = {};
  rows.forEach(function (row) {
    var rowData = [];
    // ID
    var id = row.gsx$taskid.$t.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (ids[id]) {
      alert('Duplicate task id:' + id);
    }
    ids[id] = true;
    rowData.push(id);

    if (row.gsx$taskname.$t && row.gsx$taskname.$t.startsWith('#')) {
      console.log('Skipping row ' + id + ' with name:' + row.gsx$taskname.$t);
      return;
    }

    // Name
    rowData.push(row.gsx$taskname.$t);

    // Resource
    rowData.push(row.gsx$resource.$t ? row.gsx$resource.$t.toLowerCase().trim() : null);

    // Start
    rowData.push(row.gsx$startdate.$t ? new Date(row.gsx$startdate.$t) : null);

    // End
    rowData.push(row.gsx$enddate.$t ? new Date(row.gsx$enddate.$t) : null);

    // Duration
    rowData.push(row.gsx$duration.$t ? strToMS(row.gsx$duration.$t) : null);

    // Percent
    rowData.push(row.gsx$percentcomplete.$t ? (+row.gsx$percentcomplete.$t.replace(/\D/g, '')) : 0);

    // Dependencies
    rowData.push(row.gsx$dependencies.$t ? row.gsx$dependencies.$t.toLowerCase().replace(/[^a-z0-9,]/g, '') : null);

    console.log('id,name,resource,start,end,dur,pct,dep', rowData);
    allRows.push(rowData);
  });

  // Check for missing dependencies that would break the chart.
  rows.forEach(function (row) {
    var id = row.gsx$taskid.$t.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    row.gsx$dependencies.$t.toLowerCase().split(',').forEach(function (dep) {
      var dep2 = dep.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (dep2 && !ids[dep2]) {
        alert('Task:' + id + ' is missing dependency:' + dep2);
      }
    });
  });

  data.addRows(allRows);

  var options = {
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
  var chart = new google.visualization.Gantt(document.getElementById('chart_div'));
  chart.draw(data, options);
}).catch(function (error) {
  console.log("Failed!", error);
  alert('Error, see console.');
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