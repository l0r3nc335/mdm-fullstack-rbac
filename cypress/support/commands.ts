/// <reference types="cypress" />

Cypress.Commands.add('visitRoute', (path: string) => {
  cy.visit(path, { failOnStatusCode: false });
  cy.get('body').should('be.visible');
});

Cypress.Commands.add('mockDemoAccounts', () => {
  cy.intercept('GET', '**/api/auth/demo-accounts', {
    statusCode: 200,
    body: {
      data: [
        {
          label: 'Super Admin',
          email: 'superadmin@demo.local',
          role: 'super_admin',
          organizationName: null,
        },
        {
          label: 'Admin',
          email: 'admin@acmecorp.demo.local',
          role: 'admin',
          organizationName: 'Acme Corp',
        },
      ],
    },
  }).as('demoAccounts');
});

Cypress.Commands.add('clearAuthSession', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('rbac_token');
    win.localStorage.removeItem('rbac_user');
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      visitRoute(path: string): Chainable<void>;
      mockDemoAccounts(): Chainable<void>;
      clearAuthSession(): Chainable<void>;
    }
  }
}

export {};
