/*globals gapi, google */
/*jshint esversion: 6 */
/*jshint unused:true */
/*exported login */
/** Smart injection of a URL into the head, assuming a normal js or css suffix */
var injectHead = (url, type) => {
  return new Promise((resolve, reject) => {
    let s = document.getElementsByTagName('script')[0],
      elt = null,
      switcher = type || url.split('.').reverse()[0].toLowerCase();

    switch (switcher) {
    case 'js':
    case 'script':
      elt = document.createElement('script');
      elt.type = 'text/javascript';
      elt.src = url;
      elt.onload = () => {
        console.info('injectHead inserted:', url, switcher, type);
        resolve();
      };
      s.parentNode.insertBefore(elt, s);
      break;
    case 'css':
    case 'stylesheet':
      elt = document.createElement('link');
      elt.rel = 'stylesheet';
      elt.href = url;
      s.parentNode.insertBefore(elt, s);
      console.info('injectHead inserted:', url, switcher, type);
      resolve();
      break;
    default:
      reject("Can't handle injectHead, try forcing the type:" + url + type);
    }
  });
};

/** google.charts.load as a promise */
var loadCharts = chartTypes => Promise.resolve()
  .then(() => injectHead('https://www.gstatic.com/charts/loader.js'))
  .then(() => new Promise(resolve => {
    google.charts.setOnLoadCallback(() => {
      resolve('loadCharts:' + JSON.stringify(chartTypes));
    });
    google.charts.load('current', {
      'packages': [].concat(chartTypes)
    });
  }));

// In case platformLoaded gets called earlier than expected
window.platformLoaded = () => {
  console.info('platformLoaded before auth started (ignore)');
};

/** Core login logic */
var login = (apiKey, clientId, apis) => new Promise(resolve => {
  console.group();
  console.time('Auth');
  console.info('Auth:beginning.');
  // <script async src="https://apis.google.com/js/platform:client.js" onload="platformLoaded()"></script>
  window.platformLoaded = () => {
    if (window.gapi) {
      console.info('gapi exists');
      resolve();
    }
  };
  window.platformLoaded();
}).then(() => new Promise(resolve => {
  console.info('loading client:auth2');
  gapi.load('client:auth2', resolve);
})).then(() => gapi.client.init({
  apiKey: apiKey,
  clientId: clientId,
  discoveryDocs: apis.filter(api => api.discovery).map(api => api.discovery),
  scope: [...new Set(apis.filter(api => api.scopes).map(api => api.scopes.join(' ')))].join(' ')
})).then(() => new Promise(resolve => {
  const SIGN_IN_ID = 'google-signin-button';
  let dialog = document.querySelector('#' + SIGN_IN_ID);

  let signinCheck = (isSignedIn) => {
    console.info(`signinCheck(${isSignedIn})`);
    if (isSignedIn) {
      if (dialog) {
        if (dialog.open) {
          dialog.close();
        }
        dialog.remove();
        console.log('closed and removed dialog with sign-in button.');
      }
      resolve();
    }
  };
  let gai = gapi.auth2.getAuthInstance();

  console.info('listening for signed-in user change');
  gai.isSignedIn.listen(signinCheck);
  console.info('checking for already signed-in user');
  if (gai.isSignedIn.get()) {
    signinCheck(true);
    return;
  }
  console.info('user not signed-in, build the button.');
  if (!dialog) {
    console.info('Constructing sign-in button in modal dialog.');
    dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    dialog.id = SIGN_IN_ID;
    gapi.signin2.render(SIGN_IN_ID, {
      'longtitle': true
    });
  }
  dialog.showModal();
})).then(() => {
  console.info('Fully authorized, beginning app');
  console.timeEnd('Auth');
  console.groupEnd();
  //////////////// END AUTH ////////////////
}).then(() => {
  let charts = apis.filter(api => api.chart).map(api => api.chart);
  if (charts.length > 0) {
    console.info('loading charts');
    return loadCharts(charts);
  }
});