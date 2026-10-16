import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import { containsBannedWord } from '../utils/safety.js';
import { Group, GroupMember } from '../models/Community.js';

const router = Router();
router.use(requireAuth);

const format = (g, joinedSet) => ({
  _id: g._id,
  name: g.name,
  description: g.description,
  memberCount: g.memberCount,
  isOwner: false,
  joined: joinedSet.has(String(g._id)),
});

router.get('/', wrap(async (req, res) => {
  const groups = await Group.find().sort({ memberCount: -1, createdAt: -1 }).limit(100);
  const mine = await GroupMember.find({ userId: req.user._id, groupId: { $in: groups.map((g) => g._id) } });
  const joined = new Set(mine.map((m) => String(m.groupId)));
  res.json({
    groups: groups.map((g) => ({ ...format(g, joined), isOwner: String(g.ownerId) === String(req.user._id) })),
  });
}));

router.post('/', wrap(async (req, res) => {
  if (req.user.status === 'muted') return bad(res, 'Your account is muted', 403);
  const { name, description } = req.body;
  if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 40) return bad(res, 'Group name must be 3-40 characters');
  if (containsBannedWord(`${name} ${description || ''}`)) return bad(res, 'This breaks the community guidelines');
  const group = await Group.create({
    name: name.trim(),
    description: typeof description === 'string' ? description.trim().slice(0, 200) : '',
    ownerId: req.user._id,
    memberCount: 1,
  });
  await GroupMember.create({ groupId: group._id, userId: req.user._id });
  res.status(201).json({ group: { ...format(group, new Set([String(group._id)])), isOwner: true } });
}));

router.get('/:id', wrap(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return bad(res, 'Group not found', 404);
  const member = await GroupMember.exists({ groupId: group._id, userId: req.user._id });
  res.json({
    group: { ...format(group, new Set(member ? [String(group._id)] : [])), isOwner: String(group.ownerId) === String(req.user._id) },
  });
}));

router.post('/:id/join', wrap(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return bad(res, 'Group not found', 404);
  const existing = await GroupMember.exists({ groupId: group._id, userId: req.user._id });
  if (!existing) {
    await GroupMember.create({ groupId: group._id, userId: req.user._id });
    group.memberCount += 1;
    await group.save();
  }
  res.json({ joined: true, memberCount: group.memberCount });
}));

router.post('/:id/leave', wrap(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return bad(res, 'Group not found', 404);
  if (String(group.ownerId) === String(req.user._id)) return bad(res, 'The owner cannot leave the group');
  const removed = await GroupMember.findOneAndDelete({ groupId: group._id, userId: req.user._id });
  if (removed) {
    group.memberCount = Math.max(group.memberCount - 1, 0);
    await group.save();
  }
  res.json({ joined: false, memberCount: group.memberCount });
}));

export default router;
