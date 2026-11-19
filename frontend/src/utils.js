// Accepts a bare code ("abc-defg-hij") or a pasted meeting link.
export function extractRoomId(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const m = s.match(/\/m\/([a-z0-9-]+)/i);
  return (m ? m[1] : s.split(/[/?#]/)[0]).toLowerCase();
}

export const initials = (name = '?') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '');

export function summaryToMarkdown(title, s) {
  const lines = [`# ${title}`, '', '## Summary', s.text, ''];
  if (s.keyDecisions?.length) lines.push('## Key decisions', ...s.keyDecisions.map((d) => `- ${d}`), '');
  if (s.actionItems?.length)
    lines.push(
      '## Action items',
      ...s.actionItems.map((a) => `- [ ] ${a.task}${a.owner ? ` (owner: ${a.owner})` : ''}${a.dueDate ? ` (due: ${a.dueDate})` : ''}`)
    );
  return lines.join('\n');
}
