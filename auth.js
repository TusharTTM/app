import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  // Client and API on different domains in production need sameSite "none" + secure
  return { httpOnly: true, sameSite: prod ? 'none' : 'lax', secure: prod };
}

export const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const setAuthCookie = (res, token) =>
  res.cookie('token', token, { ...cookieOptions(), maxAge: WEEK_MS });

export const clearAuthCookie = (res) => res.clearCookie('token', cookieOptions());

// The user always comes from the signed cookie, never from the request body.
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Please log in' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ error: 'Please log in' });
    if (user.status === 'banned') return res.status(403).json({ error: 'This account has been banned' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Please log in' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed' });
