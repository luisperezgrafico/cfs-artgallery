'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  clearRememberedAdminLogin,
  readRememberedAdminLogin,
  saveRememberedAdminLogin,
} from '../../../utils/adminLoginPreferences';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = readRememberedAdminLogin();
    if (saved) {
      setUsername(saved.username);
      setPassword(saved.password);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Incorrect username or password.');
        return;
      }

      if (remember) {
        saveRememberedAdminLogin({ username, password });
      } else {
        clearRememberedAdminLogin();
      }

      router.push(next);
      router.refresh();
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <h1 className="admin-login-title">Gallery — Admin</h1>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label className="admin-login-label" htmlFor="admin-login-username">Username</label>
          <input
            id="admin-login-username"
            className="admin-login-input"
            type="text"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />

          <label className="admin-login-label" htmlFor="admin-login-password">Password</label>
          <input
            id="admin-login-password"
            className="admin-login-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <label className="admin-login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            Remember my username and password
          </label>

          {error && <p className="admin-login-error">{error}</p>}

          <button type="submit" className="admin-login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-login" aria-label="Loading" />}>
      <LoginForm />
    </Suspense>
  );
}
