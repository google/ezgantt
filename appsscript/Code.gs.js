/*globals SpreadsheetApp, HtmlService */
/*jshint esversion: 8 */
/*jshint unused:true */
/*exported linkToGantt, onOpen */

/**
 * @OnlyCurrentDoc
 */

function onOpen() {
    const subMenus = [{
        name: "View Gantt Chart",
        functionName: "linkToGantt"
    }];
    SpreadsheetApp.getActiveSpreadsheet().addMenu("ezGantt", subMenus);
}

function linkToGantt() {
    const id = SpreadsheetApp.getActiveSpreadsheet().getId();

    const params = {
        // true=use the Gantt chart sort, false=keep the spreadsheet's ordering.  Optional, default=true.
        // 'sortTasks': /** @type {boolean} */ false
    };

    let queryString = '';
    if (params.entries().length > 0) {
        queryString += '?' + Object.keys(params).map((key) => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }).join('&');
    }

    const htmlString = `<a href="https://ezgantt.googleplex.com/${queryString}#${id}" target="_blank">Open Gantt View</a>`;

    const htmlOutput = HtmlService
        .createHtmlOutput(htmlString)
        .setSandboxMode(HtmlService.SandboxMode.NATIVE)
        .setHeight(60);

    SpreadsheetApp
        .getUi()
        .showModalDialog(htmlOutput, 'Open Gantt View...');
}

