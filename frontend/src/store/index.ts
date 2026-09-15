import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth-slice';
import { injectStore } from '../lib/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
