import mongoose from 'mongoose';

const { Schema } = mongoose;

const challengeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    // water_ml  = total water logged in the period
    // days_logged = number of days with at least one food log
    metric: { type: String, enum: ['water_ml', 'days_logged'], required: true },
    target: { type: Number, required: true, min: 1 },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const participantSchema = new Schema({
  challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
  showOnBoard: { type: Boolean, default: false }, // leaderboard is opt-in
});
participantSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

export const Challenge = mongoose.model('Challenge', challengeSchema);
export const ChallengeParticipant = mongoose.model('ChallengeParticipant', participantSchema);
