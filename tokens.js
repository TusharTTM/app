import crypto from 'crypto';

export const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// raw goes in the email link, hash is stored in the database
export function newToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}
