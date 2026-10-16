// Dates are plain "YYYY-MM-DD" strings (the user's local day), sent by the client.

export function isValidLocalDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

export function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The n days ending on `end` (inclusive), oldest first.
export function lastNDates(end, n) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}
