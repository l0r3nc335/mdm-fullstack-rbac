import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDemoAccounts, loginRequest } from '../lib/services';
import { setCredentials } from '../store/auth-slice';
import { useAppDispatch, useAppSelector } from '../hooks/redux';

const DEMO_PASSWORD = 'Password123!';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoQuery = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: fetchDemoAccounts,
  });

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (demoQuery.data?.length && !email) {
      setEmail(demoQuery.data[0].email);
    }
  }, [demoQuery.data, email]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await loginRequest(email, password);
      dispatch(setCredentials(result));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg-login.png)' }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-slate-950/45" aria-hidden />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/90 p-8 shadow-xl shadow-slate-950/30 backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.25em] text-teal-700">Multi-tenant RBAC</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick a seeded demo account, then authenticate against the Express API.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Demo account</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPassword(DEMO_PASSWORD);
              }}
            >
              {demoQuery.data?.map((account) => (
                <option key={account.email} value={account.email}>
                  {account.label}
                  {account.organizationName ? ` — ${account.organizationName}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
