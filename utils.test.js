import test from 'node:test';
import assert from 'node:assert/strict';
import { scale, rescale, sumLogs } from '../src/utils/nutrition.js';
import { isValidLocalDate, addDays, lastNDates } from '../src/utils/dates.js';
import { containsBannedWord, isValidCalorieTarget } from '../src/utils/safety.js';

test('scale multiplies nutrients by quantity', () => {
  const food = { kcal: 100, proteinG: 3, carbsG: 18, fatG: 2 };
  assert.deepEqual(scale(food, 2), { kcal: 200, proteinG: 6, carbsG: 36, fatG: 4 });
});

test('scale keeps unknown nutrients as null, not zero', () => {
  const r = scale({ kcal: 50, proteinG: null, carbsG: 10, fatG: undefined }, 3);
  assert.equal(r.kcal, 150);
  assert.equal(r.proteinG, null);
  assert.equal(r.fatG, null);
});

test('rescale changes a saved log to a new quantity', () => {
  const log = { quantity: 2, kcal: 200, proteinG: 6, carbsG: null, fatG: 4 };
  assert.deepEqual(rescale(log, 1), { kcal: 100, proteinG: 3, carbsG: null, fatG: 2 });
});

test('sumLogs adds a day up and skips unknown values', () => {
  const totals = sumLogs([
    { kcal: 100, proteinG: 3, carbsG: 18, fatG: 2 },
    { kcal: 250.5, proteinG: null, carbsG: 40, fatG: 8 },
    { kcal: 60, proteinG: 2, carbsG: 12, fatG: 0.3 },
  ]);
  assert.deepEqual(totals, { kcal: 410.5, proteinG: 5, carbsG: 70, fatG: 10.3 });
});

test('sumLogs of an empty day is zero', () => {
  assert.deepEqual(sumLogs([]), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
});

test('isValidLocalDate accepts real dates only', () => {
  assert.equal(isValidLocalDate('2026-10-15'), true);
  assert.equal(isValidLocalDate('2028-02-29'), true);
  assert.equal(isValidLocalDate('2026-02-30'), false);
  assert.equal(isValidLocalDate('15-10-2026'), false);
  assert.equal(isValidLocalDate(undefined), false);
  assert.equal(isValidLocalDate({ $gt: '' }), false);
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('lastNDates returns 7 days ending today, oldest first', () => {
  const d = lastNDates('2026-03-02', 7);
  assert.equal(d.length, 7);
  assert.equal(d[0], '2026-02-24');
  assert.equal(d[6], '2026-03-02');
});

test('banned word filter catches harmful content', () => {
  assert.equal(containsBannedWord('Great THINSPO board here'), true);
  assert.equal(containsBannedWord('I had dal and roti today'), false);
});

test('calorie target has a safe floor and ceiling', () => {
  assert.equal(isValidCalorieTarget(1500), true);
  assert.equal(isValidCalorieTarget(800), false);
  assert.equal(isValidCalorieTarget(9000), false);
  assert.equal(isValidCalorieTarget(NaN), false);
});
