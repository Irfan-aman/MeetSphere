import { useState } from 'react';
import { Captions, Hand, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Smile, Sparkles, Users, Video, VideoOff } from 'lucide-react';

const EMOJIS = ['👍', '👏', '❤️', '😂', '🎉', '😮'];

function Btn({ on = true, danger, accent, active, label, badge, children, ...p }) {
  return (
    <button
      className={`ctl${!on ? ' ctl-off' : ''}${active ? ' ctl-active' : ''}${danger ? ' ctl-danger' : ''}${accent ? ' ctl-accent' : ''}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      {...p}
    >
      {children}
      {badge > 0 && <i className="ctl-badge">{badge > 9 ? '9+' : badge}</i>}
      <span className="ctl-text">{label}</span>
    </button>
  );
}

export default function ControlBar({ rtc, cc, setCc, ccSupported, panel, setPanel, unread, onNotes, onLeave, peopleCount }) {
  const [reactOpen, setReactOpen] = useState(false);
  const { me } = rtc;
  return (
    <footer className="controls">
      <div className="controls-group">
        <Btn on={me.mic} label={me.mic ? 'Mute' : 'Unmute'} onClick={rtc.toggleMic} disabled={!rtc.hasAudio}>
          {me.mic ? <Mic size={20} /> : <MicOff size={20} />}
        </Btn>
        <Btn on={me.cam} label={me.cam ? 'Stop video' : 'Start video'} onClick={rtc.toggleCam} disabled={!rtc.hasVideo}>
          {me.cam ? <Video size={20} /> : <VideoOff size={20} />}
        </Btn>
        <Btn active={me.sharing} label={me.sharing ? 'Stop sharing' : 'Share screen'} onClick={rtc.toggleShare}>
          <MonitorUp size={20} />
        </Btn>
        <Btn active={cc} label="Captions" onClick={() => setCc(!cc)} disabled={!ccSupported} title={ccSupported ? 'Captions' : 'Captions need Chrome, Edge or Safari'}>
          <Captions size={20} />
        </Btn>
        <Btn active={me.hand} label="Raise hand" onClick={rtc.toggleHand}>
          <Hand size={20} />
        </Btn>
        <div className="react-wrap">
          <Btn active={reactOpen} label="React" onClick={() => setReactOpen((o) => !o)}>
            <Smile size={20} />
          </Btn>
          {reactOpen && (
            <div className="react-pop" role="menu">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => { rtc.sendReaction(e); setReactOpen(false); }} aria-label={`React ${e}`}>{e}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="controls-group">
        <Btn accent label="AI notes" onClick={onNotes}><Sparkles size={20} /></Btn>
        <Btn active={panel === 'chat'} label="Chat" badge={panel === 'chat' ? 0 : unread} onClick={() => setPanel(panel === 'chat' ? null : 'chat')}>
          <MessageSquare size={20} />
        </Btn>
        <Btn active={panel === 'people'} label={`People (${peopleCount})`} onClick={() => setPanel(panel === 'people' ? null : 'people')}>
          <Users size={20} />
        </Btn>
        <Btn danger label="Leave" onClick={onLeave}><PhoneOff size={20} /></Btn>
      </div>
    </footer>
  );
}
