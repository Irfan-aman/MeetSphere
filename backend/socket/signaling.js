import { nanoid } from 'nanoid';
import { Server } from 'socket.io';
import Meeting, { MAX_CHAT, MAX_TRANSCRIPT } from '../models/Meeting.js';
import { verifyToken } from '../middleware/auth.js';

const MAX_PARTICIPANTS = Number(process.env.MAX_PARTICIPANTS) || 8;
const EMOJIS = new Set(['👍', '👏', '❤️', '😂', '🎉', '😮']);
const rooms = new Map(); // roomId -> Map(socketId -> participant)

// Tiny per-socket rate limiter.
function allow(socket, key, max, windowMs) {
  const now = Date.now();
  const store = (socket.data.rl ??= {});
  const b = store[key];
  if (!b || now > b.reset) {
    store[key] = { n: 1, reset: now + windowMs };
    return true;
  }
  b.n += 1;
  return b.n <= max;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function initSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    maxHttpBufferSize: 1e5,
    pingInterval: 20000,
    pingTimeout: 25000,
  });

  io.use((socket, next) => {
    try {
      socket.data.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  function leave(socket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.data.roomId = null;
    socket.leave(roomId);
    const room = rooms.get(roomId);
    if (!room) return;
    room.delete(socket.id);
    io.to(roomId).emit('room:participant-left', { id: socket.id });
    if (room.size === 0) {
      rooms.delete(roomId);
      Meeting.updateOne({ roomId }, { $set: { endedAt: new Date() } }).catch(() => {});
    }
  }

  // Relay helper: only between sockets that share a room.
  const sameRoom = (socket, to) => {
    const roomId = socket.data.roomId;
    return roomId && typeof to === 'string' && rooms.get(roomId)?.has(to);
  };

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.on('room:join', async (payload, ack = () => {}) => {
      try {
        const roomId = str(payload?.roomId, 40).toLowerCase();
        const meeting = await Meeting.findOne({ roomId }).select('title host').lean();
        if (!meeting) return ack({ error: 'Meeting not found.' });
        if (socket.data.roomId) leave(socket);

        const room = rooms.get(roomId) || new Map();
        if (room.size >= MAX_PARTICIPANTS) return ack({ error: `This meeting is full (${MAX_PARTICIPANTS} people max).` });

        const info = {
          id: socket.id,
          userId: user.id,
          name: user.name,
          mic: !!payload?.mic,
          cam: !!payload?.cam,
          hand: false,
          sharing: false,
          isHost: String(meeting.host) === user.id,
        };
        const peers = [...room.values()];
        room.set(socket.id, info);
        rooms.set(roomId, room);
        socket.data.roomId = roomId;
        socket.join(roomId);

        await Meeting.updateOne({ roomId }, { $set: { endedAt: null } });
        await Meeting.updateOne(
          { roomId, 'participants.userId': { $ne: user.id } },
          { $push: { participants: { userId: user.id, name: user.name } } }
        );

        ack({ ok: true, self: info, peers, title: meeting.title });
        socket.to(roomId).emit('room:participant-joined', info);
      } catch (e) {
        console.error('[room:join]', e.message);
        ack({ error: 'Could not join the meeting.' });
      }
    });

    socket.on('room:leave', () => leave(socket));

    // --- WebRTC signaling (relay only to members of the same room) ---
    for (const evt of ['webrtc:offer', 'webrtc:answer']) {
      socket.on(evt, ({ to, sdp } = {}) => {
        if (!sameRoom(socket, to) || !sdp || typeof sdp.sdp !== 'string' || sdp.sdp.length > 60000) return;
        io.to(to).emit(evt, { from: socket.id, sdp });
      });
    }
    socket.on('webrtc:ice-candidate', ({ to, candidate } = {}) => {
      if (!sameRoom(socket, to) || !candidate || !allow(socket, 'ice', 300, 10000)) return;
      io.to(to).emit('webrtc:ice-candidate', { from: socket.id, candidate });
    });

    // --- Chat ---
    socket.on('chat:message', ({ text } = {}) => {
      const roomId = socket.data.roomId;
      const t = str(text, 2000);
      if (!roomId || !t || !allow(socket, 'chat', 12, 10000)) return;
      const msg = { id: nanoid(8), senderId: socket.id, sender: user.name, text: t, at: new Date() };
      io.to(roomId).emit('chat:message', msg);
      Meeting.updateOne(
        { roomId },
        { $push: { chatLog: { $each: [{ sender: msg.sender, senderId: msg.senderId, text: t, at: msg.at }], $slice: -MAX_CHAT } } }
      ).catch((e) => console.error('[chat save]', e.message));
    });

    // --- Captions ---
    socket.on('caption:interim', ({ text } = {}) => {
      const roomId = socket.data.roomId;
      const t = str(text, 400);
      if (!roomId || !t || !allow(socket, 'interim', 60, 10000)) return;
      socket.to(roomId).emit('caption:interim', { speakerId: socket.id, speaker: user.name, text: t });
    });
    socket.on('caption:line', ({ text } = {}) => {
      const roomId = socket.data.roomId;
      const t = str(text, 500);
      if (!roomId || !t || !allow(socket, 'caption', 30, 10000)) return;
      const line = { id: nanoid(8), speakerId: socket.id, speaker: user.name, text: t, at: new Date() };
      io.to(roomId).emit('caption:line', line);
      Meeting.updateOne(
        { roomId },
        { $push: { transcript: { $each: [{ speaker: line.speaker, speakerId: line.speakerId, text: t, at: line.at }], $slice: -MAX_TRANSCRIPT } } }
      ).catch((e) => console.error('[caption save]', e.message));
    });

    // --- Presence ---
    socket.on('media:state', (s = {}) => {
      const roomId = socket.data.roomId;
      const p = rooms.get(roomId)?.get(socket.id);
      if (!p || !allow(socket, 'media', 40, 10000)) return;
      if (typeof s.mic === 'boolean') p.mic = s.mic;
      if (typeof s.cam === 'boolean') p.cam = s.cam;
      if (typeof s.hand === 'boolean') p.hand = s.hand;
      if (typeof s.sharing === 'boolean') p.sharing = s.sharing;
      socket.to(roomId).emit('media:state', { id: socket.id, mic: p.mic, cam: p.cam, hand: p.hand, sharing: p.sharing });
    });

    socket.on('reaction', ({ emoji } = {}) => {
      const roomId = socket.data.roomId;
      if (!roomId || !EMOJIS.has(emoji) || !allow(socket, 'react', 15, 10000)) return;
      io.to(roomId).emit('reaction', { id: nanoid(6), from: socket.id, name: user.name, emoji });
    });

    socket.on('disconnect', () => leave(socket));
  });

  return io;
}
