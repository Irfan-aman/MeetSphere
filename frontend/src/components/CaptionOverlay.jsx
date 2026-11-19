export default function CaptionOverlay({ lines, interim, selfId }) {
  const recent = lines.slice(-2);
  const live = Object.entries(interim).slice(-1);
  if (!recent.length && !live.length) return null;
  const who = (id, name) => (id === selfId || id === 'me' ? 'You' : name);
  return (
    <div className="captions" role="log" aria-live="polite">
      {recent.map((l) => (
        <p key={l.id}><b>{who(l.speakerId, l.speaker)}</b> {l.text}</p>
      ))}
      {live.map(([id, v]) => (
        <p key={id} className="captions-live"><b>{who(id, v.speaker)}</b> {v.text}</p>
      ))}
    </div>
  );
}
