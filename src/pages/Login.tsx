import { useState } from 'react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { errText } from '../lib/toast';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      const next = new URLSearchParams(location.search).get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } catch (err) {
      setError(errText(err));
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap flex min-h-[100dvh] flex-col justify-center">
      <form className="mx-auto grid w-full max-w-sm gap-4" onSubmit={submit}>
        <h1 className="display rule-3 pb-3 text-[44px] leading-none">Plan</h1>
        <label className="field">
          Password
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm font-semibold text-risk">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
