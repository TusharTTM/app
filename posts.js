import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postLimiter } from '../middleware/limiters.js';
import wrap, { bad } from '../utils/asyncHandler.js';
import { containsBannedWord } from '../utils/safety.js';
import { blockedIdsFor } from '../utils/blocks.js';
import { Post, Comment, Like, GroupMember } from '../models/Community.js';

const router = Router();
router.use(requireAuth);

const PAGE = 20;

function formatPost(p, likedSet) {
  return {
    _id: p._id,
    body: p.body,
    userId: p.userId?._id ?? p.userId,
    nickname: p.userId?.nickname ?? 'unknown',
    groupId: p.groupId,
    createdAt: p.createdAt,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: likedSet.has(String(p._id)),
  };
}

async function likedSetFor(userId, posts) {
  const likes = await Like.find({ userId, postId: { $in: posts.map((p) => p._id) } }).select('postId');
  return new Set(likes.map((l) => String(l.postId)));
}

router.get('/', wrap(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const blocked = await blockedIdsFor(req.user._id);
  const filter = {
    status: 'visible',
    userId: { $nin: blocked },
    groupId: req.query.groupId || null, // main feed shows only non-group posts
  };
  const posts = await Post.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE)
    .limit(PAGE)
    .populate('userId', 'nickname');
  const liked = await likedSetFor(req.user._id, posts);
  res.json({ posts: posts.map((p) => formatPost(p, liked)), hasMore: posts.length === PAGE });
}));

router.post('/', postLimiter, wrap(async (req, res) => {
  if (req.user.status === 'muted') return bad(res, 'Your account is muted', 403);
  const { body, groupId } = req.body;
  if (typeof body !== 'string' || !body.trim() || body.length > 1000) return bad(res, 'Write 1-1000 characters');
  if (containsBannedWord(body)) return bad(res, 'This post breaks the community guidelines');
  if (groupId) {
    const member = await GroupMember.findOne({ groupId, userId: req.user._id });
    if (!member) return bad(res, 'Join the group first', 403);
  }
  const post = await Post.create({ userId: req.user._id, groupId: groupId || null, body: body.trim() });
  await post.populate('userId', 'nickname');
  res.status(201).json({ post: formatPost(post, new Set()) });
}));

router.get('/:id', wrap(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, status: 'visible' }).populate('userId', 'nickname');
  if (!post) return bad(res, 'Post not found', 404);
  const blocked = (await blockedIdsFor(req.user._id)).map(String);
  if (blocked.includes(String(post.userId._id))) return bad(res, 'Post not found', 404);
  const liked = await likedSetFor(req.user._id, [post]);
  res.json({ post: formatPost(post, liked) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
  if (!post) return bad(res, 'Post not found', 404);
  await Promise.all([
    Comment.deleteMany({ postId: post._id }),
    Like.deleteMany({ postId: post._id }),
    post.deleteOne(),
  ]);
  res.json({ ok: true });
}));

router.post('/:id/like', wrap(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
  if (!post) return bad(res, 'Post not found', 404);
  const existing = await Like.findOneAndDelete({ postId: post._id, userId: req.user._id });
  if (existing) {
    post.likeCount = Math.max(post.likeCount - 1, 0);
  } else {
    await Like.create({ postId: post._id, userId: req.user._id });
    post.likeCount += 1;
  }
  await post.save();
  res.json({ liked: !existing, likeCount: post.likeCount });
}));

router.get('/:id/comments', wrap(async (req, res) => {
  const blocked = await blockedIdsFor(req.user._id);
  const comments = await Comment.find({ postId: req.params.id, status: 'visible', userId: { $nin: blocked } })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate('userId', 'nickname');
  res.json({
    comments: comments.map((c) => ({
      _id: c._id,
      body: c.body,
      userId: c.userId?._id,
      nickname: c.userId?.nickname ?? 'unknown',
      createdAt: c.createdAt,
    })),
  });
}));

router.post('/:id/comments', postLimiter, wrap(async (req, res) => {
  if (req.user.status === 'muted') return bad(res, 'Your account is muted', 403);
  const { body } = req.body;
  if (typeof body !== 'string' || !body.trim() || body.length > 500) return bad(res, 'Write 1-500 characters');
  if (containsBannedWord(body)) return bad(res, 'This comment breaks the community guidelines');
  const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
  if (!post) return bad(res, 'Post not found', 404);
  const comment = await Comment.create({ postId: post._id, userId: req.user._id, body: body.trim() });
  post.commentCount += 1;
  await post.save();
  res.status(201).json({
    comment: { _id: comment._id, body: comment.body, userId: req.user._id, nickname: req.user.nickname, createdAt: comment.createdAt },
  });
}));

router.delete('/:postId/comments/:id', wrap(async (req, res) => {
  const c = await Comment.findOneAndDelete({ _id: req.params.id, postId: req.params.postId, userId: req.user._id });
  if (!c) return bad(res, 'Comment not found', 404);
  await Post.updateOne({ _id: req.params.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  res.json({ ok: true });
}));

export default router;
