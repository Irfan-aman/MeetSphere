import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Captions, FileText, Lock, MessageSquare, MonitorUp, Sparkles, Users, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractRoomId } from '../utils';
import Logo from '../components/Logo';

const people = ['Priya', 'Rahul', 'Aman', 'Neha'];

function Demo() {
  return (
    <div className="demo" aria-hidden="true">
      <div className="demo-room">
        <div className="demo-grid">
          {people.map((n) => (
            <div className="demo-tile" key={n}>
              <span>{n[0]}</span>
              <small>{n}</small>
            </div>
          ))}
        </div>
        <div className="demo-caption">
          <b>Rahul</b>
          <span className="typing">I’ll finish the frontend testing by Friday.</span>
        </div>
      </div>
      <div className="demo-notes">
        <h4><Sparkles size={15} /> AI notes</h4>
        <p>The team agreed to complete testing before the production launch.</p>
        <ul>
          <li><i /> Finish frontend testing <small>Rahul · Friday</small></li>
          <li><i /> Review API integration <small>No owner named</small></li>
        </ul>
      </div>
    </div>
  );
}

const steps = [
  { icon: Video, t: 'Start or join', d: 'Create a room in one click and share the link. Guests can join with just a name.' },
  { icon: Captions, t: 'Talk as usual', d: 'Live captions appear for everyone and are saved as a searchable transcript.' },
  { icon: Sparkles, t: 'Get the minutes', d: 'Ask for AI notes and receive a summary, decisions and action items in seconds.' },
];

const features = [
  { icon: Video, t: 'HD video and audio', d: 'Peer-to-peer WebRTC calls for up to eight people, with automatic reconnection.' },
  { icon: MonitorUp, t: 'Screen sharing', d: 'Share a window or tab. The shared screen is automatically spotlighted.' },
  { icon: Captions, t: 'Live captions', d: 'Speech-to-text in your browser, labeled by speaker and stored with the meeting.' },
  { icon: FileText, t: 'AI meeting notes', d: 'Summaries and action items that only name owners and dates people actually said.' },
  { icon: MessageSquare, t: 'Chat and reactions', d: 'In-meeting chat is saved, with hand raising and emoji reactions for quick feedback.' },
  { icon: Lock, t: 'Private by design', d: 'Only people who joined a meeting can open its transcript. API keys never reach the browser.' },
];

const stack = ['React', 'Vite', 'Node.js', 'Express', 'MongoDB', 'Socket.IO', 'WebRTC', 'Gemini API'];

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const go = (e) => {
    e.preventDefault();
    const id = extractRoomId(code);
    if (id) nav(`/m/${id}`);
  };

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Meetings that write their own minutes.</h1>
            <p className="lead">
              MeetSphere is a video meeting app with live captions and AI-generated summaries, so nobody has to take notes and nothing gets lost.
            </p>
            <div className="hero-actions">
              <Link to={user && !user.guest ? '/dashboard' : '/signup'} className="btn btn-primary btn-lg">
                {user && !user.guest ? 'Go to dashboard' : 'Start a meeting'}
              </Link>
              <form className="join-inline" onSubmit={go}>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Meeting code or link" aria-label="Meeting code or link" />
                <button className="btn btn-dark" disabled={!extractRoomId(code)}>Join</button>
              </form>
            </div>
            <p className="hero-note">Free to use. No downloads. Works in your browser.</p>
          </div>
          <Demo />
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <h2 className="section-title">From “hello” to action items in three steps</h2>
          <ol className="steps">
            {steps.map(({ icon: I, t, d }, i) => (
              <li key={t}>
                <span className="step-num">{i + 1}</span>
                <I size={22} />
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-tint" id="features">
        <div className="container">
          <h2 className="section-title">Everything a meeting needs, nothing it doesn’t</h2>
          <div className="features">
            {features.map(({ icon: I, t, d }) => (
              <div className="feature" key={t}>
                <I size={22} />
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container stack-row">
          <div>
            <h2 className="section-title left">Built with a modern full-stack toolkit</h2>
            <p className="muted">A MERN application extended with WebRTC for media, Socket.IO for signaling and Google’s Gemini API for meeting intelligence.</p>
          </div>
          <ul className="chips">{stack.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner">
          <h2>Your next meeting can take its own notes.</h2>
          <Link to="/signup" className="btn btn-amber btn-lg"><Users size={18} /> Create a free account</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="brand"><Logo size={24} /> MeetSphere</span>
          <span className="muted">Video meetings with live captions and AI notes.</span>
        </div>
      </footer>
    </main>
  );
}
