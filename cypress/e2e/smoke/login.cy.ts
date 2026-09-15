describe('login page smoke', () => {
  beforeEach(() => {
    cy.clearAuthSession();
    cy.mockDemoAccounts();
  });

  it('loads demo accounts into the dropdown', () => {
    cy.visitRoute('/login');
    cy.wait('@demoAccounts');
    cy.get('select').find('option').should('have.length.at.least', 2);
    cy.get('select').should('contain.text', 'Super Admin');
    cy.contains('button', /sign in/i).should('be.visible');
  });
});
