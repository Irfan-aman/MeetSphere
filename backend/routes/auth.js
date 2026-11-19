import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) });
const guestSchema = z.object({ name: z.string().trim().min(1, 'Enter a display name').max(40) });

const firstError = (r) => r.error.issues[0]?.message || 'Invalid input';
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, guest: false });

router.post('/signup', limiter, async (req, res, next) => {
  try {
    const p = signupSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: firstError(p) });
    if (await User.exists({ email: p.data.email }))
      return res.status(409).json({ error: 'An account with this email already exists.' });
    const user = await User.create({
      name: p.data.name,
      email: p.data.email,
      passwordHash: await bcrypt.hash(p.data.password, 10),
    });
    const u = publicUser(user);
    res.status(201).json({ token: signToken({ id: u.id, name: u.name }), user: u });
  } catch (e) {
    next(e);
  }
});

router.post('/login', limiter, async (req, res, next) => {
  try {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Enter your email and password.' });
    const user = await User.findOne({ email: p.data.email });
    const ok = user && (await bcrypt.compare(p.data.password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });
    const u = publicUser(user);
    res.json({ token: signToken({ id: u.id, name: u.name }), user: u });
  } catch (e) {
    next(e);
  }
});

router.post('/guest', limiter, (req, res) => {
  const p = guestSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: firstError(p) });
  const user = { id: `guest_${nanoid(10)}`, name: p.data.name, guest: true };
  res.json({ token: signToken(user, '12h'), user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
