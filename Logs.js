import mongoose from 'mongoose';

const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name, required: true });

// Each food log keeps its own copy of the nutrients, so editing a food later
// does not change what the user logged in the past.
const foodLogSchema = new Schema({
  userId: ref('User'),
  foodId: ref('Food'),
  foodName: { type: String, required: true },
  servingDesc: String,
  mealType: { type: String, enum: ['breakfast', 'lunch', 'snack', 'dinner'], required: true },
  quantity: { type: Number, required: true, min: 0.25, max: 20 },
  kcal: { type: Number, default: null },
  proteinG: { type: Number, default: null },
  carbsG: { type: Number, default: null },
  fatG: { type: Number, default: null },
  loggedAt: { type: Date, default: Date.now },
  localDate: { type: String, required: true }, // YYYY-MM-DD in the user's own day
});
foodLogSchema.index({ userId: 1, localDate: 1 });

const waterLogSchema = new Schema({
  userId: ref('User'),
  amountMl: { type: Number, required: true, min: 50, max: 3000 },
  loggedAt: { type: Date, default: Date.now },
  localDate: { type: String, required: true },
});
waterLogSchema.index({ userId: 1, localDate: 1 });

const weightLogSchema = new Schema({
  userId: ref('User'),
  weightKg: { type: Number, required: true, min: 20, max: 300 },
  loggedAt: { type: Date, default: Date.now },
  localDate: { type: String, required: true },
});
weightLogSchema.index({ userId: 1, loggedAt: -1 });

export const FoodLog = mongoose.model('FoodLog', foodLogSchema);
export const WaterLog = mongoose.model('WaterLog', waterLogSchema);
export const WeightLog = mongoose.model('WeightLog', weightLogSchema);
