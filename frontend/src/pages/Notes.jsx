import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import SummaryView from '../components/SummaryView';
import { fmtDate, fmtTime } from '../utils';

export default function Notes() {
  const { roomId } = useParams();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/meetings/${roomId}/details`)
      .then(({ data: d }) => { setData(d); setSummary(d.summary); })
      .catch((e) => setError(errMsg(e)));
  }, [roomId]);

  if (error) return (
    <main className="center-screen"><div className="empty"><h1>Can’t open these notes</h1><p>{error}</p><Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link></div></main>
  );
  if (!data) return <div className="center-screen"><div className="spinner" /></div>;

  return (
    <main className="container page notes">
      <Link to="/dashboard" className="back"><ArrowLeft size={16} /> All meetings</Link>
      <h1 className="page-title">{data.title}</h1>
      <p className="muted">{fmtDate(data.startedAt)} · hosted by {data.hostName} · code {data.roomId}</p>

      <div className="notes-grid">
        <div className="panel">
          <SummaryView roomId={roomId} title={data.title} summary={summary} setSummary={setSummary} />
        </div>
        <div className="panel">
          <h2>Transcript</h2>
          {data.transcript.length === 0 ? (
            <p className="muted">No captions were recorded. Turn on captions during a meeting to build a transcript.</p>
          ) : (
            <ul className="transcript">
              {data.transcript.map((l, i) => (
                <li key={i}><time>{fmtTime(l.at)}</time><b>{l.speaker}</b> {l.text}</li>
              ))}
            </ul>
          )}
          {data.chatLog.length > 0 && (
            <>
              <h2 className="mt">Chat</h2>
              <ul className="transcript">
                {data.chatLog.map((l, i) => (
                  <li key={i}><time>{fmtTime(l.at)}</time><b>{l.sender}</b> {l.text}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
