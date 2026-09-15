import { beforeEach, describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import {
  authReducer,
  logout,
  setActiveOrganization,
  setCredentials,
} from '../src/store/auth-slice';
import type { AuthUser } from '../src/types/api';

const sampleUser: AuthUser = {
  id: 1,
  email: 'admin@acmecorp.demo.local',
  firstName: 'Ada',
  lastName: 'Admin',
  organizationId: 1,
  organization: { id: 1, uuid: 'org-1', name: 'Acme Corp' },
  teamId: null,
  managerId: null,
  roles: [{ id: 1, code: 'admin', name: 'Admin' }],
  permissions: ['user:manage', 'content:read'],
};

function createAuthStore() {
  return configureStore({
    reducer: { auth: authReducer },
  });
}

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores credentials in state and localStorage', () => {
    const store = createAuthStore();
    store.dispatch(setCredentials({ token: 'token-1', user: sampleUser }));

    expect(store.getState().auth.token).toBe('token-1');
    expect(store.getState().auth.user?.email).toBe(sampleUser.email);
    expect(localStorage.getItem('rbac_token')).toBe('token-1');
    expect(JSON.parse(localStorage.getItem('rbac_user') ?? 'null')).toMatchObject({
      email: sampleUser.email,
    });
  });

  it('updates the active organization', () => {
    const store = createAuthStore();
    store.dispatch(setCredentials({ token: 'token-1', user: sampleUser }));
    store.dispatch(
      setActiveOrganization({ id: 2, uuid: 'org-2', name: 'Globex Industries' }),
    );

    expect(store.getState().auth.user?.organizationId).toBe(2);
    expect(store.getState().auth.user?.organization?.name).toBe('Globex Industries');
  });

  it('clears credentials on logout', () => {
    const store = createAuthStore();
    store.dispatch(setCredentials({ token: 'token-1', user: sampleUser }));
    store.dispatch(logout());

    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    expect(localStorage.getItem('rbac_token')).toBeNull();
    expect(localStorage.getItem('rbac_user')).toBeNull();
  });
});
