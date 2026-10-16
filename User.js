import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    role: { type: String, enum: ['member', 'moderator', 'admin'], default: 'member' },
    status: { type: String, enum: ['active', 'muted', 'banned'], default: 'active' },
    emailVerified: { type: Boolean, default: false },
    verifyToken: String, // hash
    resetToken: String, // hash
    resetExpires: Date,
    onboarded: { type: Boolean, default: false },
    profile: {
      heightCm: Number,
      goalType: { type: String, enum: ['balanced', 'maintain', 'track_only'], default: 'track_only' },
      calorieTarget: Number,
      unitSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
