import { Router } from 'express';
import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';
import Meeting, { isMember } from '../models/Meeting.js';
import { requireAuth, requireAccount } from '../middleware/auth.js';

const router = Router();
const alphabet = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);
const makeRoomId = () => {
  const a = alphabet();
  return `${a.slice(0, 3)}-${a.slice(3, 7)}-${a.slice(7)}`;
};
const normalize = (id) => String(id || '').toLowerCase().trim();

router.post('/', requireAuth, requireAccount, async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 120) || 'Untitled meeting';
    for (let i = 0; i < 5; i++) {
      try {
        const m = await Meeting.create({
          roomId: makeRoomId(),
          title,
          host: req.user.id,
          hostName: req.user.name,
          participants: [{ userId: req.user.id, name: req.user.name }],
        });
        return res.status(201).json({ roomId: m.roomId, title: m.title });
      } catch (e) {
        if (e.code !== 11000) throw e; // retry only on duplicate roomId
      }
    }
    res.status(500).json({ error: 'Could not create a meeting. Please try again.' });
  } catch (e) {
    next(e);
  }
});

router.get('/mine', requireAuth, requireAccount, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const list = await Meeting.aggregate([
      { $match: { $or: [{ host: new mongoose.Types.ObjectId(uid) }, { 'participants.userId': uid }] } },
      { $sort: { startedAt: -1 } },
      { $limit: 30 },
      {
        $project: {
          _id: 0,
          roomId: 1,
          title: 1,
          hostName: 1,
          startedAt: 1,
          endedAt: 1,
          hasSummary: { $ne: ['$summary.generatedAt', null] },
          transcriptLines: { $size: '$transcript' },
          participantCount: { $size: '$participants' },
        },
      },
    ]);
    res.json({ meetings: list });
  } catch (e) {
    next(e);
  }
});

// Public metadata only (title + host) so the join screen can show what you're joining.
router.get('/:roomId', async (req, res, next) => {
  try {
    const m = await Meeting.findOne({ roomId: normalize(req.params.roomId) }).select('roomId title hostName').lean();
    if (!m) return res.status(404).json({ error: 'Meeting not found. Check the code and try again.' });
    res.json({ roomId: m.roomId, title: m.title, hostName: m.hostName });
  } catch (e) {
    next(e);
  }
});

// Full record (chat, transcript, summary): host and people who joined only.
router.get('/:roomId/details', requireAuth, async (req, res, next) => {
  try {
    const m = await Meeting.findOne({ roomId: normalize(req.params.roomId) }).lean();
    if (!m) return res.status(404).json({ error: 'Meeting not found.' });
    if (!isMember(m, req.user)) return res.status(403).json({ error: 'You did not take part in this meeting.' });
    res.json({
      roomId: m.roomId,
      title: m.title,
      hostName: m.hostName,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      chatLog: m.chatLog,
      transcript: m.transcript,
      summary: m.summary?.generatedAt ? m.summary : null,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
