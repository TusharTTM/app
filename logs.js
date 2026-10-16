import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import { isValidLocalDate } from '../utils/dates.js';
import { scale, rescale } from '../utils/nutrition.js';
import Food from '../models/Food.js';
import { FoodLog, WaterLog, WeightLog } from '../models/Logs.js';

const router = Router();
router.use(requireAuth);

const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];

// Every query below filters by req.user._id, so users only ever touch their own logs.

// ---------- food ----------
router.get('/food', wrap(async (req, res) => {
  if (!isValidLocalDate(req.query.date)) return bad(res, 'Invalid date');
  const logs = await FoodLog.find({ userId: req.user._id, localDate: req.query.date }).sort({ loggedAt: 1 });
  res.json({ logs });
}));

router.post('/food', wrap(async (req, res) => {
  const { foodId, mealType, quantity, localDate } = req.body;
  const q = Number(quantity);
  if (!MEALS.includes(mealType)) return bad(res, 'Invalid meal');
  if (!Number.isFinite(q) || q < 0.25 || q > 20) return bad(res, 'Quantity must be between 0.25 and 20');
  if (!isValidLocalDate(localDate)) return bad(res, 'Invalid date');
  const food = await Food.findOne({ _id: foodId, $or: [{ isVerified: true }, { createdBy: req.user._id }] });
  if (!food) return bad(res, 'Food not found', 404);
  const log = await FoodLog.create({
    userId: req.user._id,
    foodId: food._id,
    foodName: food.nameEn,
    servingDesc: food.servingDesc,
    mealType,
    quantity: q,
    localDate,
    ...scale(food, q),
  });
  res.status(201).json({ log });
}));

router.put('/food/:id', wrap(async (req, res) => {
  const log = await FoodLog.findOne({ _id: req.params.id, userId: req.user._id });
  if (!log) return bad(res, 'Not found', 404);
  const { quantity, mealType } = req.body;
  if (mealType !== undefined) {
    if (!MEALS.includes(mealType)) return bad(res, 'Invalid meal');
    log.mealType = mealType;
  }
  if (quantity !== undefined) {
    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 0.25 || q > 20) return bad(res, 'Quantity must be between 0.25 and 20');
    Object.assign(log, rescale(log, q));
    log.quantity = q;
  }
  await log.save();
  res.json({ log });
}));

router.delete('/food/:id', wrap(async (req, res) => {
  const r = await FoodLog.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (!r.deletedCount) return bad(res, 'Not found', 404);
  res.json({ ok: true });
}));

// ---------- water ----------
router.get('/water', wrap(async (req, res) => {
  if (!isValidLocalDate(req.query.date)) return bad(res, 'Invalid date');
  const logs = await WaterLog.find({ userId: req.user._id, localDate: req.query.date }).sort({ loggedAt: 1 });
  res.json({ logs });
}));

router.post('/water', wrap(async (req, res) => {
  const ml = Number(req.body.amountMl);
  if (!Number.isFinite(ml) || ml < 50 || ml > 3000) return bad(res, 'Amount must be between 50 and 3000 ml');
  if (!isValidLocalDate(req.body.localDate)) return bad(res, 'Invalid date');
  const log = await WaterLog.create({ userId: req.user._id, amountMl: ml, localDate: req.body.localDate });
  res.status(201).json({ log });
}));

router.delete('/water/:id', wrap(async (req, res) => {
  const r = await WaterLog.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (!r.deletedCount) return bad(res, 'Not found', 404);
  res.json({ ok: true });
}));

// ---------- weight (always private) ----------
router.get('/weight', wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 365);
  const logs = await WeightLog.find({ userId: req.user._id }).sort({ loggedAt: -1 }).limit(limit);
  res.json({ logs });
}));

router.post('/weight', wrap(async (req, res) => {
  const kg = Number(req.body.weightKg);
  if (!Number.isFinite(kg) || kg < 20 || kg > 300) return bad(res, 'Weight must be between 20 and 300 kg');
  if (!isValidLocalDate(req.body.localDate)) return bad(res, 'Invalid date');
  const log = await WeightLog.create({ userId: req.user._id, weightKg: kg, localDate: req.body.localDate });
  res.status(201).json({ log });
}));

router.delete('/weight/:id', wrap(async (req, res) => {
  const r = await WeightLog.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (!r.deletedCount) return bad(res, 'Not found', 404);
  res.json({ ok: true });
}));

export default router;
