import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import User from '../models/User.js';
import { Report, Post, Comment } from '../models/Community.js';

// Moderators work with reports, posts and comments only. No route here (or anywhere
// for moderators/admins) returns another user's food, water or weight logs.
const router = Router();
router.use(requireAuth, requireRole('moderator', 'admin'));

router.get('/reports', wrap(async (req, res) => {
  const status = ['open', 'actioned', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
  const reports = await Report.find({ status }).sort({ createdAt: -1 }).limit(100).populate('reporterId', 'nickname');
  const out = await Promise.all(
    reports.map(async (r) => {
      let preview = null;
      if (r.targetType === 'post') {
        const p = await Post.findById(r.targetId).populate('userId', 'nickname');
        if (p) preview = { text: p.body, author: p.userId?.nickname, state: p.status };
      } else if (r.targetType === 'comment') {
        const c = await Comment.findById(r.targetId).populate('userId', 'nickname');
        if (c) preview = { text: c.body, author: c.userId?.nickname, state: c.status };
      } else {
        const u = await User.findById(r.targetId).select('nickname status');
        if (u) preview = { text: `User: ${u.nickname}`, author: u.nickname, state: u.status };
      }
      return {
        _id: r._id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        reporter: r.reporterId?.nickname,
        createdAt: r.createdAt,
        preview,
      };
    })
  );
  res.json({ reports: out });
}));

router.post('/reports/:id/resolve', wrap(async (req, res) => {
  const { action } = req.body;
  if (!['hide', 'dismiss'].includes(action)) return bad(res, 'Invalid action');
  const report = await Report.findById(req.params.id);
  if (!report) return bad(res, 'Report not found', 404);
  if (action === 'hide') {
    if (report.targetType === 'post') await Post.updateOne({ _id: report.targetId }, { status: 'hidden' });
    else if (report.targetType === 'comment') await Comment.updateOne({ _id: report.targetId }, { status: 'hidden' });
    else return bad(res, 'Use mute for users');
  }
  report.status = action === 'hide' ? 'actioned' : 'dismissed';
  report.handledBy = req.user._id;
  await report.save();
  res.json({ ok: true });
}));

router.post('/posts/:id/hide', wrap(async (req, res) => {
  const r = await Post.updateOne({ _id: req.params.id }, { status: 'hidden' });
  if (!r.matchedCount) return bad(res, 'Post not found', 404);
  res.json({ ok: true });
}));

router.post('/comments/:id/hide', wrap(async (req, res) => {
  const r = await Comment.updateOne({ _id: req.params.id }, { status: 'hidden' });
  if (!r.matchedCount) return bad(res, 'Comment not found', 404);
  res.json({ ok: true });
}));

async function setMuted(req, res, status) {
  const user = await User.findById(req.params.id);
  if (!user) return bad(res, 'User not found', 404);
  if (user.role !== 'member') return bad(res, 'You can only mute regular members', 403);
  if (user.status === 'banned') return bad(res, 'User is banned');
  user.status = status;
  await user.save();
  res.json({ ok: true, status });
}

router.post('/users/:id/mute', wrap((req, res) => setMuted(req, res, 'muted')));
router.post('/users/:id/unmute', wrap((req, res) => setMuted(req, res, 'active')));

export default router;
