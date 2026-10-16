// Basic community safety helpers. Extend the list as your moderators see new spam.
const BANNED_WORDS = [
  'thinspo',
  'meanspo',
  'proana',
  'pro-ana',
  'promia',
  'starve yourself',
  'diet pills',
  'fat burner',
  'miracle cure',
  'buy now',
  'whatsapp me',
  'dm me for',
];

export function containsBannedWord(text) {
  const t = String(text || '').toLowerCase();
  return BANNED_WORDS.some((w) => t.includes(w));
}

export const MIN_CALORIE_TARGET = 1200;
export const MAX_CALORIE_TARGET = 4000;

export function isValidCalorieTarget(n) {
  return Number.isFinite(n) && n >= MIN_CALORIE_TARGET && n <= MAX_CALORIE_TARGET;
}
