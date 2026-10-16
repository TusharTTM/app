import mongoose from 'mongoose';

const { Schema } = mongoose;
const id = (name, required = true) => ({ type: Schema.Types.ObjectId, ref: name, required });

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    ownerId: id('User'),
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const groupMemberSchema = new Schema({
  groupId: id('Group'),
  userId: id('User'),
  joinedAt: { type: Date, default: Date.now },
});
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

const postSchema = new Schema(
  {
    userId: id('User'),
    groupId: id('Group', false), // null = main feed
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
postSchema.index({ groupId: 1, createdAt: -1 });

const commentSchema = new Schema(
  {
    postId: id('Post'),
    userId: id('User'),
    body: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
  },
  { timestamps: true }
);
commentSchema.index({ postId: 1, createdAt: 1 });

const likeSchema = new Schema({ postId: id('Post'), userId: id('User') });
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

const blockSchema = new Schema({ blockerId: id('User'), blockedId: id('User') });
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const reportSchema = new Schema(
  {
    reporterId: id('User'),
    targetType: { type: String, enum: ['post', 'comment', 'user'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
    status: { type: String, enum: ['open', 'actioned', 'dismissed'], default: 'open' },
    handledBy: id('User', false),
  },
  { timestamps: true }
);

export const Group = mongoose.model('Group', groupSchema);
export const GroupMember = mongoose.model('GroupMember', groupMemberSchema);
export const Post = mongoose.model('Post', postSchema);
export const Comment = mongoose.model('Comment', commentSchema);
export const Like = mongoose.model('Like', likeSchema);
export const Block = mongoose.model('Block', blockSchema);
export const Report = mongoose.model('Report', reportSchema);
