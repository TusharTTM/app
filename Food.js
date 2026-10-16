import mongoose from 'mongoose';

// Nutrient values are per serving. Unknown values stay null (not 0).
const nutrient = { type: Number, default: null, min: 0 };

const foodSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true, trim: true, maxlength: 80 },
    aliases: [{ type: String, trim: true, lowercase: true }],
    servingDesc: { type: String, required: true, trim: true, maxlength: 60 },
    servingGrams: { type: Number, default: null },
    kcal: { type: Number, required: true, min: 0, max: 3000 },
    proteinG: nutrient,
    carbsG: nutrient,
    fatG: nutrient,
    fiberG: nutrient,
    source: { type: String, default: 'user' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

foodSchema.index({ nameEn: 1 });
foodSchema.index({ aliases: 1 });

export default mongoose.model('Food', foodSchema);
