import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Meeting, { isMember } from '../models/Meeting.js';
import { requireAuth } from '../middleware/auth.js';
import { generateMeetingSummary } from '../services/geminiService.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'You have requested several summaries recently. Please wait a few minutes.' },
});

const MIN_WORDS = 25;

router.post('/:roomId', requireAuth, limiter, async (req, res, next) => {
  try {
    const m = await Meeting.findOne({ roomId: String(req.params.roomId).toLowerCase().trim() });
    if (!m) return res.status(404).json({ error: 'Meeting not found.' });
    if (!isMember(m, req.user)) return res.status(403).json({ error: 'You did not take part in this meeting.' });

    const sourceCount = m.transcript.length + m.chatLog.length;
    const words = [...m.transcript, ...m.chatLog].reduce((n, l) => n + (l.text || '').split(/\s+/).length, 0);
    if (words < MIN_WORDS) {
      return res.status(400).json({
        error: 'Not enough conversation to summarize yet. Turn on captions or chat for a bit, then try again.',
      });
    }

    const force = req.body?.force === true;
    if (!force && m.summary?.generatedAt && m.summary.sourceCount === sourceCount) {
      return res.json({ summary: m.summary, cached: true });
    }

    let result;
    try {
      result = await generateMeetingSummary({ title: m.title, transcript: m.transcript, chat: m.chatLog });
    } catch (e) {
      console.error('[summarize] Gemini error:', e.internal || e.message);
      return res.status(e.status || 502).json({ error: e.publicMessage || 'The AI service is unavailable right now.' });
    }

    const summary = {
      text: result.summary,
      keyDecisions: result.keyDecisions,
      actionItems: result.actionItems.map((a) => ({ ...a, status: 'pending' })),
      generatedAt: new Date(),
      model: result.model,
      sourceCount,
    };
    // $set only the summary so we never clobber chat/transcript lines written by sockets meanwhile.
    await Meeting.updateOne({ _id: m._id }, { $set: { summary } });
    res.json({ summary, cached: false });
  } catch (e) {
    next(e);
  }
});

export default router;
