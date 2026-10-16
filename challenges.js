import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import { isValidLocalDate } from '../utils/dates.js';
import { Challenge, ChallengeParticipant } from '../models/Challenge.js';
import { FoodLog, WaterLog } from '../models/Logs.js';

const router = Router();
router.use(requireAuth);

async function scoreFor(challenge, userId) {
  const range = { $gte: challenge.startDate, $lte: challenge.endDate };
  if (challenge.metric === 'water_ml') {
    const rows = await WaterLog.aggregate([
      { $match: { userId, localDate: range } },
      { $group: { _id: null, total: { $sum: '$amountMl' } } },
    ]);
    return rows[0]?.total || 0;
  }
  const days = await FoodLog.distinct('localDate', { userId, localDate: range });
  return days.length;
}

router.get('/', wrap(async (req, res) => {
  const challenges = await Challenge.find().sort({ startDate: -1 }).limit(50);
  const mine = await ChallengeParticipant.find({
    userId: req.user._id,
    challengeId: { $in: challenges.map((c) => c._id) },
  });
  const byId = new Map(mine.map((p) => [String(p.challengeId), p]));
  res.json({
    challenges: await Promise.all(
      challenges.map(async (c) => {
        const p = byId.get(String(c._id));
        return {
          _id: c._id,
          title: c.title,
          metric: c.metric,
          target: c.target,
          startDate: c.startDate,
          endDate: c.endDate,
          joined: Boolean(p),
          showOnBoard: p ? p.showOnBoard : false,
          myScore: p ? await scoreFor(c, req.user._id) : null,
        };
      })
    ),
  });
}));

// Only moderators and admins create challenges
router.post('/', requireRole('moderator', 'admin'), wrap(async (req, res) => {
  const { title, metric, target, startDate, endDate } = req.body;
  if (typeof title !== 'string' || title.trim().length < 3) return bad(res, 'Enter a title');
  if (!['water_ml', 'days_logged'].includes(metric)) return bad(res, 'Invalid metric');
  const t = Number(target);
  if (!Number.isFinite(t) || t < 1) return bad(res, 'Target must be a positive number');
  if (!isValidLocalDate(startDate) || !isValidLocalDate(endDate) || endDate < startDate) return bad(res, 'Check the dates');
  const challenge = await Challenge.create({ title: title.trim(), metric, target: t, startDate, endDate, createdBy: req.user._id });
  res.status(201).json({ challenge });
}));

router.post('/:id/join', wrap(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return bad(res, 'Challenge not found', 404);
  await ChallengeParticipant.updateOne(
    { challengeId: challenge._id, userId: req.user._id },
    { $setOnInsert: { showOnBoard: Boolean(req.body.showOnBoard) } },
    { upsert: true }
  );
  res.json({ joined: true });
}));

router.post('/:id/leave', wrap(async (req, res) => {
  await ChallengeParticipant.deleteOne({ challengeId: req.params.id, userId: req.user._id });
  res.json({ joined: false });
}));

router.put('/:id/visibility', wrap(async (req, res) => {
  const p = await ChallengeParticipant.findOneAndUpdate(
    { challengeId: req.params.id, userId: req.user._id },
    { showOnBoard: Boolean(req.body.showOnBoard) },
    { new: true }
  );
  if (!p) return bad(res, 'Join the challenge first', 404);
  res.json({ showOnBoard: p.showOnBoard });
}));

// Leaderboard only lists people who opted in
router.get('/:id/board', wrap(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return bad(res, 'Challenge not found', 404);
  const participants = await ChallengeParticipant.find({ challengeId: challenge._id, showOnBoard: true })
    .limit(100)
    .populate('userId', 'nickname');
  const board = await Promise.all(
    participants.map(async (p) => ({ nickname: p.userId?.nickname ?? 'unknown', score: await scoreFor(challenge, p.userId._id) }))
  );
  board.sort((a, b) => b.score - a.score);
  res.json({ board, target: challenge.target, metric: challenge.metric });
}));

export default router;
