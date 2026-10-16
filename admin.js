import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import User from '../models/User.js';
import Food from '../models/Food.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/users', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  const filter = q ? { $or: [{ nickname: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(30).select('email nickname role status');
  res.json({ users });
}));

async function changeUser(req, res, apply) {
  const user = await User.findById(req.params.id);
  if (!user) return bad(res, 'User not found', 404);
  if (String(user._id) === String(req.user._id)) return bad(res, 'You cannot change your own account here');
  if (user.role === 'admin') return bad(res, 'Admins cannot be changed here', 403);
  const error = apply(user);
  if (error) return bad(res, error);
  await user.save();
  res.json({ ok: true, user: { _id: user._id, nickname: user.nickname, role: user.role, status: user.status } });
}

router.post('/users/:id/ban', wrap((req, res) => changeUser(req, res, (u) => { u.status = 'banned'; })));
router.post('/users/:id/unban', wrap((req, res) => changeUser(req, res, (u) => { u.status = 'active'; })));
router.post('/users/:id/role', wrap((req, res) =>
  changeUser(req, res, (u) => {
    if (!['member', 'moderator'].includes(req.body.role)) return 'Role must be member or moderator';
    u.role = req.body.role;
  })
));

// ---------- food database ----------
router.get('/foods', wrap(async (req, res) => {
  const filter = req.query.verified === 'false' ? { isVerified: false } : {};
  const foods = await Food.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ foods });
}));

const FIELDS = ['nameEn', 'servingDesc', 'kcal', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'servingGrams'];

router.post('/foods', wrap(async (req, res) => {
  const data = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  if (Array.isArray(req.body.aliases)) data.aliases = req.body.aliases.map(String);
  const food = await Food.create({ ...data, source: 'admin', isVerified: true, createdBy: req.user._id });
  res.status(201).json({ food });
}));

router.put('/foods/:id', wrap(async (req, res) => {
  const food = await Food.findById(req.params.id);
  if (!food) return bad(res, 'Food not found', 404);
  for (const f of FIELDS) if (req.body[f] !== undefined) food[f] = req.body[f];
  if (Array.isArray(req.body.aliases)) food.aliases = req.body.aliases.map(String);
  if (req.body.isVerified !== undefined) food.isVerified = Boolean(req.body.isVerified);
  await food.save();
  res.json({ food });
}));

router.delete('/foods/:id', wrap(async (req, res) => {
  const r = await Food.deleteOne({ _id: req.params.id });
  if (!r.deletedCount) return bad(res, 'Food not found', 404);
  res.json({ ok: true });
}));

export default router;
