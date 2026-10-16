const round1 = (v) => Math.round(v * 10) / 10;

// Multiply a nutrient by a quantity. Unknown (null/undefined) stays null, never 0.
const mul = (v, q) => (v === null || v === undefined ? null : round1(v * q));

export function scale(food, quantity) {
  return {
    kcal: mul(food.kcal, quantity),
    proteinG: mul(food.proteinG, quantity),
    carbsG: mul(food.carbsG, quantity),
    fatG: mul(food.fatG, quantity),
  };
}

// Change a saved snapshot to a new quantity without needing the original food.
export function rescale(log, newQuantity) {
  const factor = newQuantity / log.quantity;
  return {
    kcal: mul(log.kcal, factor),
    proteinG: mul(log.proteinG, factor),
    carbsG: mul(log.carbsG, factor),
    fatG: mul(log.fatG, factor),
  };
}

// Add up a day's logs. Unknown values are skipped.
export function sumLogs(logs) {
  const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const l of logs) {
    for (const k of Object.keys(totals)) {
      if (typeof l[k] === 'number') totals[k] += l[k];
    }
  }
  for (const k of Object.keys(totals)) totals[k] = round1(totals[k]);
  return totals;
}
