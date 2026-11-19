import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Loader2, Plus, Video } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { extractRoomId, fmtDate } from '../utils';

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState(null);

  useEffect(() => {
    api.get('/meetings/mine').then(({ data }) => setList(data.meetings)).catch((e) => { setError(errMsg(e)); setList([]); });
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/meetings', { title });
      nav(`/m/${data.roomId}`);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const join = (e) => {
    e.preventDefault();
    const id = extractRoomId(code);
    if (id) nav(`/m/${id}`);
  };

  return (
    <main className="container page">
      <h1 className="page-title">Hi, {user.name.split(' ')[0]}</h1>
      <p className="muted">Start a new meeting or pick up where you left off.</p>

      <div className="dash-actions">
        <form className="panel" onSubmit={create}>
          <h2><Plus size={18} /> New meeting</h2>
          <label className="field">
            <span>Meeting title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly project review" maxLength={120} />
          </label>
          <button className="btn btn-primary" disabled={busy}>{busy ? <Loader2 size={18} className="spin" /> : <><Video size={18} /> Start meeting</>}</button>
        </form>
        <form className="panel" onSubmit={join}>
          <h2><ArrowRight size={18} /> Join a meeting</h2>
          <label className="field">
            <span>Meeting code or link</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc-defg-hij" />
          </label>
          <button className="btn btn-dark" disabled={!extractRoomId(code)}>Join meeting</button>
        </form>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <h2 className="list-title">Your meetings</h2>
      {list === null ? (
        <div className="center-box"><div className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>No meetings yet</h3>
          <p>Start your first meeting above. Its transcript and AI notes will show up here.</p>
        </div>
      ) : (
        <ul className="meetings">
          {list.map((m) => (
            <li key={m.roomId}>
              <div className="meetings-main">
                <h3>{m.title}</h3>
                <p className="muted">{fmtDate(m.startedAt)} · {m.participantCount} {m.participantCount === 1 ? 'person' : 'people'} · code {m.roomId}</p>
              </div>
              {m.hasSummary && <span className="pill pill-ok"><FileText size={13} /> Notes ready</span>}
              <div className="meetings-actions">
                <Link to={`/notes/${m.roomId}`} className="btn btn-ghost btn-sm">Notes</Link>
                <Link to={`/m/${m.roomId}`} className="btn btn-dark btn-sm">Rejoin</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
