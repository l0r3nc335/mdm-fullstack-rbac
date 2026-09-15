describe('auth guards', () => {
  beforeEach(() => {
    cy.clearAuthSession();
    cy.mockDemoAccounts();
  });

  it('redirects unauthenticated users to login', () => {
    cy.visitRoute('/');
    cy.url().should('include', '/login');
    cy.contains('Sign in').should('be.visible');
  });

  it('shows the login form with email and password inputs', () => {
    cy.visitRoute('/login');
    cy.wait('@demoAccounts');
    cy.contains('Sign in').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('select').should('be.visible');
  });
});
