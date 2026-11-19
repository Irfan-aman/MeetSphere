import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';
import SummaryView from './SummaryView';

export default function SummaryModal({ roomId, title, onClose }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get(`/meetings/${roomId}/details`).then(({ data }) => setSummary(data.summary)).catch(() => {});
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roomId, onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="AI meeting notes">
        <div className="modal-head">
          <h2>AI meeting notes</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <SummaryView roomId={roomId} title={title} summary={summary} setSummary={setSummary} />
        </div>
      </div>
    </div>
  );
}
