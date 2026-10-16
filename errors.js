export function errorHandler(err, req, res, next) {
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) return res.status(409).json({ error: 'That email or nickname is already taken' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
}
