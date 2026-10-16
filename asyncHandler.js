// Wrap async route handlers so errors reach the error middleware.
export default function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export const bad = (res, message, status = 400) => res.status(status).json({ error: message });
