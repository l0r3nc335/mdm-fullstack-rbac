import React from 'react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../src/components/protected-route';
import { authReducer } from '../src/store/auth-slice';
import type { AuthUser } from '../src/types/api';

const sampleUser: AuthUser = {
  id: 1,
  email: 'employee@demo.local',
  firstName: 'Eve',
  lastName: 'Employee',
  organizationId: 1,
  organization: { id: 1, uuid: 'org-1', name: 'Acme Corp' },
  teamId: 1,
  managerId: 2,
  roles: [{ id: 1, code: 'employee', name: 'Employee' }],
  permissions: ['content:read', 'content:write'],
};

function renderWithAuth(token: string | null) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        token,
        user: token ? sampleUser : null,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderWithAuth(null);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders child routes when authenticated', () => {
    renderWithAuth('valid-token');
    expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
  });
});
