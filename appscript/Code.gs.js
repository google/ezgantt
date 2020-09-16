/*globals SpreadsheetApp */
/*jshint esversion: 8 */
/*jshint unused:true */
/*exported linkToGantt */

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
    const htmlString = `<a href="https://ezgantt.googleplex.com/#${id}" target="_blank">Open Gantt View</a>`;

    const htmlOutput = HtmlService
        .createHtmlOutput(htmlString)
        .setSandboxMode(HtmlService.SandboxMode.NATIVE)
        .setHeight(60);

    SpreadsheetApp
        .getUi()
        .showModalDialog(htmlOutput, 'Open Gantt View...');
}

