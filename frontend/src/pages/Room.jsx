import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Loader2, TriangleAlert, X } from 'lucide-react';
import useWebRTC from '../hooks/useWebRTC';
import useLiveCaptions from '../hooks/useLiveCaptions';
import { useAuth } from '../context/AuthContext';
import VideoTile from '../components/VideoTile';
import ControlBar from '../components/ControlBar';
import ChatPanel from '../components/ChatPanel';
import PeoplePanel from '../components/PeoplePanel';
import CaptionOverlay from '../components/CaptionOverlay';
import SummaryModal from '../components/SummaryModal';

function Timer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return <span className="timer">{s >= 3600 ? `${Math.floor(s / 3600)}:` : ''}{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</span>;
}

export default function Room({ roomId, settings }) {
  const { token, user } = useAuth();
  const nav = useNavigate();
  const rtc = useWebRTC({ roomId, token, initial: { mic: settings.mic, cam: settings.cam } });
  const [panel, setPanel] = useState(null);
  const [cc, setCc] = useState(settings.captions);
  const [notes, setNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seen, setSeen] = useState(0);

  const cap = useLiveCaptions({
    socketRef: rtc.socketRef,
    enabled: cc && rtc.status === 'joined' && rtc.me.mic,
    onInterim: rtc.setLocalInterim,
  });

  useEffect(() => {
    if (panel === 'chat') setSeen(rtc.messages.length);
  }, [panel, rtc.messages.length]);

  const tiles = useMemo(() => {
    const self = { id: 'me', local: true, name: user?.name || 'You', stream: rtc.previewStream, mic: rtc.me.mic, cam: rtc.me.cam, hand: rtc.me.hand, sharing: rtc.me.sharing, isHost: rtc.me.isHost };
    return [self, ...Object.values(rtc.peers)];
  }, [user, rtc.previewStream, rtc.me, rtc.peers]);

  const pinned = tiles.find((t) => t.sharing && !t.local) || tiles.find((t) => t.sharing);
  const others = pinned ? tiles.filter((t) => t !== pinned) : tiles;

  const leave = () => {
    nav(user && !user.guest ? `/notes/${roomId}` : '/');
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/m/${roomId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  if (rtc.status === 'error')
    return (
      <main className="center-screen">
        <div className="empty">
          <TriangleAlert size={28} />
          <h1>Couldn’t join the meeting</h1>
          <p>{rtc.error}</p>
          <button className="btn btn-primary" onClick={() => nav('/')}>Back to home</button>
        </div>
      </main>
    );

  const notice = rtc.notice || cap.error;

  return (
    <div className="room">
      <header className="room-head">
        <div className="room-title">
          <h1>{rtc.title || 'Meeting'}</h1>
          <Timer />
        </div>
        <button className="btn btn-room btn-sm" onClick={copyLink}>
          {copied ? <><Check size={15} /> Link copied</> : <><Copy size={15} /> {roomId}</>}
        </button>
      </header>

      {rtc.status !== 'joined' && (
        <div className="room-banner" role="status"><Loader2 size={15} className="spin" /> {rtc.status === 'connecting' ? 'Connecting…' : ''}</div>
      )}
      {notice && (
        <div className="room-banner room-banner-warn" role="status">
          {notice}
          <button className="icon-btn" onClick={() => { rtc.setNotice(''); }} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      <div className="room-body">
        <main className={`stage${pinned ? ' stage-spot' : ''}`} data-count={others.length + (pinned ? 1 : 0)}>
          {pinned && <VideoTile tile={pinned} large />}
          <div className={pinned ? 'strip' : 'grid'} data-count={others.length}>
            {others.map((t) => <VideoTile key={t.id} tile={t} />)}
          </div>
          <div className="reactions" aria-hidden="true">
            {rtc.reactions.map((r) => (
              <div key={r.id} className="reaction"><span>{r.emoji}</span><small>{r.from === rtc.me.id ? 'You' : r.name}</small></div>
            ))}
          </div>
          {cc && <CaptionOverlay lines={rtc.captionLines} interim={rtc.interim} selfId={rtc.me.id} />}
        </main>

        {panel === 'chat' && <ChatPanel messages={rtc.messages} selfId={rtc.me.id} onSend={rtc.sendChat} onClose={() => setPanel(null)} />}
        {panel === 'people' && <PeoplePanel people={tiles} onClose={() => setPanel(null)} />}
      </div>

      <ControlBar
        rtc={rtc}
        cc={cc}
        setCc={setCc}
        ccSupported={cap.supported}
        panel={panel}
        setPanel={setPanel}
        unread={Math.max(0, rtc.messages.length - seen)}
        peopleCount={tiles.length}
        onNotes={() => setNotes(true)}
        onLeave={leave}
      />
      {notes && <SummaryModal roomId={roomId} title={rtc.title || 'Meeting'} onClose={() => setNotes(false)} />}
    </div>
  );
}
