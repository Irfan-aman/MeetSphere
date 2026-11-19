import { Hand, MicOff, VideoOff, X } from 'lucide-react';
import { initials } from '../utils';

export default function PeoplePanel({ people, onClose }) {
  return (
    <aside className="side" aria-label="Participants">
      <div className="side-head">
        <h2>People ({people.length})</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close people"><X size={18} /></button>
      </div>
      <ul className="side-body people">
        {people.map((p) => (
          <li key={p.id}>
            <span className="avatar">{initials(p.name)}</span>
            <span className="people-name">{p.name}{p.local ? ' (You)' : ''}{p.isHost && <em>Host</em>}</span>
            <span className="people-state">
              {p.hand && <Hand size={16} aria-label="Hand raised" className="amber" />}
              {!p.cam && <VideoOff size={16} aria-label="Camera off" />}
              {!p.mic && <MicOff size={16} aria-label="Muted" />}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
