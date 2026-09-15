import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../types/api';

const TOKEN_KEY = 'rbac_token';
const USER_KEY = 'rbac_user';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY),
  user: loadUser(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ token: string; user: AuthUser }>,
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    setActiveOrganization(
      state,
      action: PayloadAction<{ id: number; uuid: string; name: string } | null>,
    ) {
      if (!state.user) return;
      state.user = {
        ...state.user,
        organizationId: action.payload?.id ?? null,
        organization: action.payload
          ? {
              id: action.payload.id,
              uuid: action.payload.uuid,
              name: action.payload.name,
            }
          : null,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, setActiveOrganization, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
