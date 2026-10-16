import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import Food from '../models/Food.js';
import { containsBannedWord } from '../utils/safety.js';

const router = Router();
router.use(requireAuth);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Search verified foods plus the user's own custom foods
router.get('/', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (!q) return res.json({ foods: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const foods = await Food.find({
    $and: [
      { $or: [{ isVerified: true }, { createdBy: req.user._id }] },
      { $or: [{ nameEn: rx }, { aliases: rx }] },
    ],
  })
    .sort({ isVerified: -1, nameEn: 1 })
    .limit(20);
  res.json({ foods });
}));

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

router.post('/', wrap(async (req, res) => {
  const { nameEn, servingDesc, kcal, proteinG, carbsG, fatG, fiberG } = req.body;
  if (typeof nameEn !== 'string' || nameEn.trim().length < 2) return bad(res, 'Enter a food name');
  if (typeof servingDesc !== 'string' || !servingDesc.trim()) return bad(res, 'Enter a serving size, e.g. "1 bowl"');
  if (containsBannedWord(nameEn)) return bad(res, 'Please use a different name');
  const k = Number(kcal);
  if (!Number.isFinite(k) || k < 0 || k > 3000) return bad(res, 'Calories must be between 0 and 3000');
  const others = [proteinG, carbsG, fatG, fiberG].map(num);
  if (others.some((v) => v !== null && (!Number.isFinite(v) || v < 0 || v > 500))) return bad(res, 'Check the nutrient values');

  const food = await Food.create({
    nameEn: nameEn.trim(),
    servingDesc: servingDesc.trim(),
    kcal: k,
    proteinG: others[0],
    carbsG: others[1],
    fatG: others[2],
    fiberG: others[3],
    source: 'user',
    createdBy: req.user._id,
    isVerified: false,
  });
  res.status(201).json({ food });
}));

export default router;
