import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import { isValidLocalDate, lastNDates } from '../utils/dates.js';
import { sumLogs } from '../utils/nutrition.js';
import { FoodLog, WaterLog, WeightLog } from '../models/Logs.js';

const router = Router();
router.use(requireAuth);

router.get('/daily', wrap(async (req, res) => {
  const date = req.query.date;
  if (!isValidLocalDate(date)) return bad(res, 'Invalid date');
  const userId = req.user._id;
  const [foods, water, weight] = await Promise.all([
    FoodLog.find({ userId, localDate: date }),
    WaterLog.find({ userId, localDate: date }),
    WeightLog.findOne({ userId }).sort({ loggedAt: -1 }),
  ]);
  res.json({
    date,
    totals: sumLogs(foods),
    foodCount: foods.length,
    waterMl: water.reduce((s, w) => s + w.amountMl, 0),
    latestWeight: weight ? { weightKg: weight.weightKg, localDate: weight.localDate } : null,
    calorieTarget: req.user.profile?.calorieTarget ?? null,
  });
}));

// Last 7 days ending on `date`. Days with no logs are null so charts show gaps.
router.get('/weekly', wrap(async (req, res) => {
  const end = req.query.date;
  if (!isValidLocalDate(end)) return bad(res, 'Invalid date');
  const dates = lastNDates(end, 7);
  const match = { userId: req.user._id, localDate: { $gte: dates[0], $lte: dates[6] } };

  const [foodRows, waterRows] = await Promise.all([
    FoodLog.aggregate([{ $match: match }, { $group: { _id: '$localDate', kcal: { $sum: '$kcal' } } }]),
    WaterLog.aggregate([{ $match: match }, { $group: { _id: '$localDate', ml: { $sum: '$amountMl' } } }]),
  ]);
  const kcalByDay = new Map(foodRows.map((r) => [r._id, Math.round(r.kcal)]));
  const waterByDay = new Map(waterRows.map((r) => [r._id, r.ml]));

  res.json({
    days: dates.map((d) => ({
      date: d,
      kcal: kcalByDay.has(d) ? kcalByDay.get(d) : null,
      waterMl: waterByDay.has(d) ? waterByDay.get(d) : null,
    })),
  });
}));

export default router;
