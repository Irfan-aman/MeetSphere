import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET;

export const signToken = (payload, expiresIn = '7d') => jwt.sign(payload, secret(), { expiresIn });

export const verifyToken = (token) => {
  const d = jwt.verify(token, secret());
  return { id: String(d.id), name: d.name, guest: !!d.guest };
};

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export function requireAccount(req, res, next) {
  if (req.user?.guest) return res.status(403).json({ error: 'Create a free account to use this feature.' });
  next();
}
