import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });

export const globalLimiter = make(15 * 60 * 1000, 600, 'Too many requests, please slow down');
export const authLimiter = make(15 * 60 * 1000, 30, 'Too many attempts, try again in a few minutes');
export const postLimiter = make(10 * 60 * 1000, 15, 'You are posting too fast, please wait a bit');
