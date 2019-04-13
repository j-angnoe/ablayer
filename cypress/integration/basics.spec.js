it('Will proxy an external site succesfully', () => {
    cy.visit('http://localhost:12301');

    // The target's index.html is loaded
    cy.get('body').should('contain', '#marker:target-index-html#');

    // Our abtest.js is injected
    cy.get('body').should('contain', '#marker:my-abtest#');

    // style1 from target is loaded
    cy.get('#style1').should('have.css', 'background-color').and('match', /rgb\(0, 128, 0\)/);
    
    // and the stylesheet style2 from my ablayer should be loaded
    cy.get('#style2').should('have.css', 'background-color').and('match', /rgb\(255, 0, 0\)/);
});


it('Will stay on ablayer host when navigating', () => {
    cy.visit('http://localhost:12301');

    cy.contains('Relative link').click();

    // Assert that we are on ablayer/page1.html
    cy.get('body').should('contain', '#marker:ablayer page1#');


    cy.visit('http://localhost:12301');

    cy.contains('Absolute link').click();

    // Assert that we are on ablayer/page1.html
    cy.get('body').should('contain', '#marker:ablayer page1#');

    cy.visit('http://localhost:12301');

    cy.contains('Full url link').click();

    // Assert that we are on ablayer/page1.html
    cy.get('body').should('contain', '#marker:ablayer page1#');
});


// @todo: test redirects and fetches..