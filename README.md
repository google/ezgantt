# ezGantt

View a Google Spreadsheet as a Gantt Chart

ezGantt uses public JavaScript and Google Drive APIs, so only users who can view the Spreadsheet can see the Gantt chart.
To try it, go to https://ezgantt.appspot.com/#TODO

# Feature Requests

[ ] Public appspot.com version
[x] Any line item task descripton where the task starts with a '#' is ignored
[ ] Drive API v3, Sheets API v4
[ ] Allow both date and depends-on constraints, and choose latest one as a "no earlier than" constraint.
[ ] Last updated date (and who?)
[x] Enforce unique ID column
[x] Easier linking from sheet to chart
[x] Resources in demo = people
[x] Easier hash tag
[ ] new better auth, fetch, promises flow (pledge?)

# INFO

## ezgantt.apspot.com

`gcloud app deploy -q --project ezgantt --version 1 --verbosity=info app.yaml`

* app id: ezgantt
* api key, client id, client secret: see JS files.

# QUOTES

    "I think ezgantt is a great tool for small-medium projects, it's easy to learn (took me minutes to get a good chart) and maintain."

# References

* https://developers.google.com/chart/interactive/docs/gallery/ganttchart
* https://developers.google.com/sheets/api/quickstart/js
* https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get


