import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Shell({ title, sub, children, footer }) {
  return (
    <main className="auth">
      <aside className="auth-side">
        <div>
          <h2>Less note-taking.<br />More listening.</h2>
          <p>Live captions and AI summaries turn every call into clear minutes with owners and next steps.</p>
        </div>
        <div className="auth-quote">
          <b>Priya</b> Can you send the revised timeline?
          <br />
          <b>Rahul</b> Yes, I’ll share it by Thursday.
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{sub}</p>
          {children}
          <p className="auth-foot">{footer}</p>
        </div>
      </section>
    </main>
  );
}

function useAuthForm(path, fields) {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [v, setV] = useState(fields);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(path, v);
      login(data.token, data.user);
      nav(loc.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };
  return { v, set: (k) => (e) => setV({ ...v, [k]: e.target.value }), error, busy, submit };
}

const Field = ({ label, ...p }) => (
  <label className="field">
    <span>{label}</span>
    <input {...p} />
  </label>
);

export function Login() {
  const { user } = useAuth();
  const f = useAuthForm('/auth/login', { email: '', password: '' });
  if (user && !user.guest) return <Navigate to="/dashboard" replace />;
  return (
    <Shell title="Welcome back" sub="Sign in to start meetings and review your notes." footer={<>New here? <Link to="/signup">Create an account</Link></>}>
      <form onSubmit={f.submit} className="form">
        <Field label="Email" type="email" autoComplete="email" required value={f.v.email} onChange={f.set('email')} />
        <Field label="Password" type="password" autoComplete="current-password" required value={f.v.password} onChange={f.set('password')} />
        {f.error && <div className="alert alert-error" role="alert">{f.error}</div>}
        <button className="btn btn-primary btn-block" disabled={f.busy}>{f.busy ? <Loader2 size={18} className="spin" /> : 'Sign in'}</button>
      </form>
    </Shell>
  );
}

export function Signup() {
  const { user } = useAuth();
  const f = useAuthForm('/auth/signup', { name: '', email: '', password: '' });
  if (user && !user.guest) return <Navigate to="/dashboard" replace />;
  return (
    <Shell title="Create your account" sub="Free to start. You’ll be in a meeting in under a minute." footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
      <form onSubmit={f.submit} className="form">
        <Field label="Full name" autoComplete="name" required minLength={2} value={f.v.name} onChange={f.set('name')} />
        <Field label="Email" type="email" autoComplete="email" required value={f.v.email} onChange={f.set('email')} />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={8} value={f.v.password} onChange={f.set('password')} />
        <small className="muted">Use at least 8 characters.</small>
        {f.error && <div className="alert alert-error" role="alert">{f.error}</div>}
        <button className="btn btn-primary btn-block" disabled={f.busy}>{f.busy ? <Loader2 size={18} className="spin" /> : 'Create account'}</button>
      </form>
    </Shell>
  );
}
