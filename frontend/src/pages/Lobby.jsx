import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { captionsSupported } from '../hooks/useLiveCaptions';
import Logo from '../components/Logo';
import { initials } from '../utils';

export default function Lobby({ roomId, onJoin }) {
  const { user, login } = useAuth();
  const [meta, setMeta] = useState(null);
  const [metaErr, setMetaErr] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [cc, setCc] = useState(captionsSupported);
  const [stream, setStream] = useState(null);
  const [permErr, setPermErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const video = useRef(null);

  useEffect(() => {
    api.get(`/meetings/${roomId}`).then(({ data }) => setMeta(data)).catch((e) => setMetaErr(errMsg(e)));
  }, [roomId]);

  useEffect(() => {
    let s;
    let dead = false;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (dead) return s.getTracks().forEach((t) => t.stop());
        setStream(s);
      } catch {
        setPermErr('Camera or microphone access is blocked. You can still join and use chat, or allow access in your browser settings.');
        setMic(false);
        setCam(false);
      }
    })();
    return () => {
      dead = true;
      s?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
    stream?.getAudioTracks().forEach((t) => (t.enabled = mic));
    stream?.getVideoTracks().forEach((t) => (t.enabled = cam));
  }, [stream, mic, cam]);

  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let displayName = user?.name;
      if (!user) {
        const { data } = await api.post('/auth/guest', { name });
        login(data.token, data.user);
        displayName = data.user.name;
      }
      onJoin({ mic, cam, captions: cc, name: displayName });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  if (metaErr)
    return (
      <main className="center-screen">
        <div className="empty"><h1>Meeting not found</h1><p>{metaErr}</p><Link to="/" className="btn btn-primary">Back to home</Link></div>
      </main>
    );

  return (
    <main className="lobby">
      <Link to="/" className="brand lobby-brand"><Logo /><span>MeetSphere</span></Link>
      <div className="lobby-grid">
        <div className="preview">
          <video ref={video} autoPlay playsInline muted className="mirror" style={{ opacity: stream && cam ? 1 : 0 }} />
          {!(stream && cam) && <div className="tile-avatar"><span>{initials(name || 'You')}</span></div>}
          <div className="preview-controls">
            <button className={`ctl ctl-round${mic ? '' : ' ctl-off'}`} onClick={() => setMic(!mic)} disabled={!stream} aria-label={mic ? 'Mute microphone' : 'Unmute microphone'}>
              {mic ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button className={`ctl ctl-round${cam ? '' : ' ctl-off'}`} onClick={() => setCam(!cam)} disabled={!stream} aria-label={cam ? 'Turn camera off' : 'Turn camera on'}>
              {cam ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>
        </div>

        <form className="lobby-card" onSubmit={join}>
          <h1>{meta ? meta.title : 'Loading…'}</h1>
          <p className="muted">{meta ? `Hosted by ${meta.hostName} · code ${roomId}` : 'Checking the meeting…'}</p>
          {permErr && <div className="alert alert-warn">{permErr}</div>}
          <label className="field">
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} disabled={!!user} placeholder="Enter your name" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={cc} onChange={(e) => setCc(e.target.checked)} disabled={!captionsSupported} />
            <span>
              Share live captions
              <small>
                {captionsSupported
                  ? 'Your speech is transcribed by your browser, shown to everyone and saved with the meeting.'
                  : 'Captions need Chrome, Edge or Safari.'}
              </small>
            </span>
          </label>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !meta || !name.trim()}>
            {busy ? <Loader2 size={18} className="spin" /> : 'Join now'}
          </button>
          {!user && <p className="auth-foot">Have an account? <Link to="/login" state={{ from: `/m/${roomId}` }}>Sign in</Link> to keep your notes.</p>}
        </form>
      </div>
    </main>
  );
}
