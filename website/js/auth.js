/*globals gapi, google */
/*jshint esversion: 6 */
/*jshint unused:true */
/*exported login */


/** Core login logic */
var login = (apiKey, clientId, apis) => Promise.resolve().then(()=>{
  console.group();
  console.time('Auth');
  console.info('Auth:beginning.');
  console.assert(window.gapi, `Missing window.gapi`);
}).then(() => new Promise(resolve => {
  gapi.load('client:auth2', resolve); // Promise not working :(
})).then(() => new Promise(resolve => {
  console.assert(gapi.client, `Missing gapi.client`);
  console.assert(gapi.auth2, `Missing gapi.auth2`);
  // Block on document being fully ready, in case we need to build a login button
  if (document.readyState === 'complete') {
    console.info(`document.readyState=${document.readyState}`);
    resolve();
    return;
  }
  let onReady = () => {
    resolve();
    document.removeEventListener('DOMContentLoaded', onReady, true);
    window.removeEventListener('load', onReady, true);
  };
  document.addEventListener('DOMContentLoaded', onReady, true);
  window.addEventListener('load', onReady, true);
})).then(() => gapi.client.init({
  apiKey: apiKey,
  clientId: clientId,
  discoveryDocs: apis.filter(api => api.discovery).map(api => api.discovery),
  scope: [...new Set(apis.filter(api => api.scopes).map(api => api.scopes.join(' ')))].join(' ')
})).then(() => new Promise(resolve => {
  const SIGN_IN_ID = 'google-signin-button';
  let dialog = document.querySelector('#' + SIGN_IN_ID);

  let signinCheck = isSignedIn => {
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
    return google.charts.load('current', {
      'packages': [].concat(charts)
    });
  }
});