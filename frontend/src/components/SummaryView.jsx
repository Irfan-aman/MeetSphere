import { useState } from 'react';
import { Check, Copy, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { fmtDate, summaryToMarkdown } from '../utils';

// Shared by the in-meeting modal and the saved-notes page.
export default function SummaryView({ roomId, title, summary, setSummary }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/summarize/${roomId}`, { force: !!summary });
      setSummary(data.summary);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryToMarkdown(title, summary));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Select the text and copy it manually.');
    }
  };

  return (
    <div className="summary">
      {!summary && !busy && (
        <div className="summary-empty">
          <Sparkles size={28} />
          <h3>Turn this meeting into notes</h3>
          <p>Gemini reads the captions and chat from this meeting and writes a summary, key decisions and action items.</p>
        </div>
      )}
      {busy && (
        <div className="summary-empty" role="status">
          <Loader2 size={28} className="spin" />
          <h3>Writing your notes…</h3>
          <p>This usually takes a few seconds.</p>
        </div>
      )}
      {summary && !busy && (
        <>
          <section>
            <h3>Summary</h3>
            <p>{summary.text}</p>
          </section>
          <section>
            <h3>Key decisions</h3>
            {summary.keyDecisions?.length ? (
              <ul className="bullets">{summary.keyDecisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
            ) : <p className="muted">No clear decisions were made.</p>}
          </section>
          <section>
            <h3>Action items</h3>
            {summary.actionItems?.length ? (
              <ul className="actions">
                {summary.actionItems.map((a, i) => (
                  <li key={i}>
                    <span className="check" aria-hidden="true" />
                    <div>
                      <p>{a.task}</p>
                      <small>{a.owner ? `Owner: ${a.owner}` : 'No owner named'}{a.dueDate ? ` · Due: ${a.dueDate}` : ''}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No action items were assigned.</p>}
          </section>
          <p className="summary-foot">Generated {fmtDate(summary.generatedAt)}. AI notes can contain mistakes, so check anything important.</p>
        </>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="summary-actions">
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          {summary ? <><RefreshCw size={16} /> Regenerate</> : <><Sparkles size={16} /> Generate AI notes</>}
        </button>
        {summary && (
          <button className="btn btn-ghost" onClick={copy}>
            {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy as Markdown</>}
          </button>
        )}
      </div>
      <p className="privacy">Generating notes sends this meeting’s captions and chat to Google’s Gemini API.</p>
    </div>
  );
}
