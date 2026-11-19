import 'dotenv/config';
import dns from 'node:dns';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';
import summarizeRoutes from './routes/summarize.js';
import { initSocket } from './socket/signaling.js';

// Only needed on networks that block MongoDB "+srv" lookups (querySrv ECONNREFUSED).
// Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env to use it.
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
}

const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret || jwtSecret.startsWith('change-me') || (isProd && jwtSecret.length < 24)) {
  console.error('JWT_SECRET is missing or still the placeholder. Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}
const origins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);
const corsOrigin = (origin, cb) => (!origin || origins.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed')));

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 240, standardHeaders: true, legacyHeaders: false }));

app.get('/', (_req, res) => res.type('text').send('MeetSphere API is running.'));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1, ai: !!process.env.GEMINI_API_KEY })
);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/summarize', summarizeRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  if (err.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed' });
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const server = http.createServer(app);
initSocket(server, corsOrigin);
mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`MeetSphere API listening on :${PORT}`));
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
