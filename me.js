import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/publicUser.js';
import { isValidCalorieTarget, MIN_CALORIE_TARGET, MAX_CALORIE_TARGET } from '../utils/safety.js';
import User from '../models/User.js';
import { FoodLog, WaterLog, WeightLog } from '../models/Logs.js';
import { Group, GroupMember, Post, Comment, Like, Block, Report } from '../models/Community.js';
import { ChallengeParticipant } from '../models/Challenge.js';

const router = Router();
router.use(requireAuth);

const GOALS = ['balanced', 'maintain', 'track_only'];
const UNITS = ['metric', 'imperial'];

router.get('/', (req, res) => res.json({ user: publicUser(req.user) }));

router.put('/', wrap(async (req, res) => {
  const { heightCm, goalType, calorieTarget, unitSystem, onboarded } = req.body;
  const u = req.user;

  if (goalType !== undefined) {
    if (!GOALS.includes(goalType)) return bad(res, 'Invalid goal');
    u.set('profile.goalType', goalType);
  }
  if (unitSystem !== undefined) {
    if (!UNITS.includes(unitSystem)) return bad(res, 'Invalid unit system');
    u.set('profile.unitSystem', unitSystem);
  }
  if (heightCm !== undefined) {
    if (heightCm === null || heightCm === '') u.set('profile.heightCm', undefined);
    else {
      const h = Number(heightCm);
      if (!Number.isFinite(h) || h < 50 || h > 250) return bad(res, 'Height must be between 50 and 250 cm');
      u.set('profile.heightCm', h);
    }
  }
  if (calorieTarget !== undefined) {
    if (calorieTarget === null || calorieTarget === '') u.set('profile.calorieTarget', undefined);
    else {
      const c = Number(calorieTarget);
      if (!isValidCalorieTarget(c)) {
        return bad(res, `Calorie target must be between ${MIN_CALORIE_TARGET} and ${MAX_CALORIE_TARGET}`);
      }
      u.set('profile.calorieTarget', c);
    }
  }
  if (onboarded !== undefined) u.onboarded = Boolean(onboarded);

  await u.save();
  res.json({ user: publicUser(u) });
}));

// Delete the account and everything the user created
router.delete('/', wrap(async (req, res) => {
  const ok = await bcrypt.compare(String(req.body.password || ''), req.user.passwordHash);
  if (!ok) return bad(res, 'Password is incorrect');
  const uid = req.user._id;

  const myGroups = (await Group.find({ ownerId: uid }).select('_id')).map((g) => g._id);
  const joined = (await GroupMember.find({ userId: uid }).select('groupId')).map((m) => m.groupId);
  const postIds = (await Post.find({ $or: [{ userId: uid }, { groupId: { $in: myGroups } }] }).select('_id')).map((p) => p._id);

  await Promise.all([
    Comment.deleteMany({ $or: [{ userId: uid }, { postId: { $in: postIds } }] }),
    Like.deleteMany({ $or: [{ userId: uid }, { postId: { $in: postIds } }] }),
    Post.deleteMany({ _id: { $in: postIds } }),
    GroupMember.deleteMany({ $or: [{ userId: uid }, { groupId: { $in: myGroups } }] }),
    Group.updateMany({ _id: { $in: joined, $nin: myGroups } }, { $inc: { memberCount: -1 } }),
    Group.deleteMany({ _id: { $in: myGroups } }),
    FoodLog.deleteMany({ userId: uid }),
    WaterLog.deleteMany({ userId: uid }),
    WeightLog.deleteMany({ userId: uid }),
    ChallengeParticipant.deleteMany({ userId: uid }),
    Block.deleteMany({ $or: [{ blockerId: uid }, { blockedId: uid }] }),
    Report.deleteMany({ reporterId: uid }),
  ]);
  await User.deleteOne({ _id: uid });
  res.clearCookie('token');
  res.json({ ok: true });
}));

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/export', wrap(async (req, res) => {
  const uid = req.user._id;
  const [foods, water, weights] = await Promise.all([
    FoodLog.find({ userId: uid }).sort({ localDate: 1, loggedAt: 1 }),
    WaterLog.find({ userId: uid }).sort({ localDate: 1, loggedAt: 1 }),
    WeightLog.find({ userId: uid }).sort({ localDate: 1, loggedAt: 1 }),
  ]);
  const rows = [['type', 'date', 'item', 'amount', 'kcal', 'protein_g', 'carbs_g', 'fat_g']];
  for (const f of foods) rows.push(['food', f.localDate, `${f.mealType}: ${f.foodName}`, f.quantity, f.kcal, f.proteinG, f.carbsG, f.fatG]);
  for (const w of water) rows.push(['water', w.localDate, 'water (ml)', w.amountMl, '', '', '', '']);
  for (const w of weights) rows.push(['weight', w.localDate, 'weight (kg)', w.weightKg, '', '', '', '']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="my-nutrition-data.csv"');
  res.send(rows.map((r) => r.map(csvCell).join(',')).join('\n'));
}));

export default router;
