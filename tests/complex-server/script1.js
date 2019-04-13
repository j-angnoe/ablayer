var _log = document.getElementById('log');

function log(message) {
    if (typeof message !== "string") {
        message = JSON.stringify(message, null, 3);
    }

    _log.innerHTML += "\n" + message;
}

function relativeApiCall() {
    // a relative call:
    fetch('/api/call1').then(res => res.json()).then(data => {
        log("(relativeApiCall) /api/call1 returned:");
        log(data);
    })
}

function fullUrlApiCall() {
    // a relative call:
    fetch('//localhost:12302/api/call1').then(res => res.json()).then(data => {
        log("(fullUrlApiCall) /api/call1 returned:");
        log(data);
    })
}

function getApiCall2() {
    fetch('/api/call2').then(res => res.json()).then(data => {
        log("(apiCall2) /api/call2 returned:");
        log(data);
    })
}

function apiGetCookie() {
    fetch('/api/cookie', { credentials: "include" }).then(res => res.json()).then(data => {
        log('getCookie:');
        log(data);
    });
}


function apiSetCookie() {
    fetch('/api/setcookie', { credentials: "include" }).then(res => res.json()).then(data => {
        log('setCookie:');
        log(data);
    });
}


function apiClearCookie() {
    fetch('/api/clearcookie', { credentials: "include" }).then(res => res.json()).then(data => {
        log('apiClearCookie:');
        log(data);
    });
}
