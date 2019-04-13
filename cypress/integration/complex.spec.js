it('Can connect to complex server', () => {

    cy.visit('http://localhost:12303');

    cy.get('#btn-api-call-relative').click();

    seeLog('(relativeApiCall) /api/call1 returned:');
    seeLog('"param": "value"');

    resetLog();
    cy.get('#btn-api-call-fullurl').click();
    seeLog('(fullUrlApiCall) /api/call1 returned:')
    seeLog('"param": "value"');

});

it('Can overwrite api calls', () => {
    cy.visit('http://localhost:12303');

    resetLog()
    cy.get('#btn-api-call-2').click();
    seeLog("(apiCall2) /api/call2 returned:");
    seeLog('"value": "ablayer server value"');

});

it('Cookies are working', () => {
    cy.visit('http://localhost:12303');

    
    cy.get('#btn-api-clearcookie').click();

    resetLog()

    cy.get('#btn-api-getcookie').click();
    // see there are no cookies
    seeLog('"cookies": {}');


    resetLog()
    cy.get('#btn-api-setcookie').click();
    resetLog()
    cy.get('#btn-api-getcookie').click();
    seeLog("getCookie:");
    seeLog('"complex_server_cookie": "');
});



function resetLog() {
    cy.get('#reset-log').click();
}
function seeLog(msg) {
    cy.get('#log').should('contain', msg);
}
