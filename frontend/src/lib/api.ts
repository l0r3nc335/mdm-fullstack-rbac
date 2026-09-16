import axios from 'axios';
import type { store } from '../store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

type RootState = ReturnType<typeof store.getState>;

let getState: (() => RootState) | null = null;

export function injectStore(_store: typeof store) {
  getState = () => _store.getState();
}

api.interceptors.request.use((config) => {
  const token = getState?.().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    let message = error.message ?? 'Request failed';
    const status = error.response?.status as number | undefined;
    const data = error.response?.data;
    const headers = error.response?.headers as Record<string, string> | undefined;

    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        message = parsed.error?.message ?? message;
      } catch {
        // keep default
      }
    } else if (data?.error?.message) {
      message = data.error.message;
    }

    if (status === 429) {
      const retryAfter = headers?.['retry-after'] ?? headers?.['ratelimit-reset'];
      message = retryAfter
        ? `${message} (retry after ${retryAfter}s)`
        : message;
    }

    return Promise.reject(new Error(message));
  },
);
