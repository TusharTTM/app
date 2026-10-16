// Run with: npm run seed
// Loads the starter foods and (optionally) creates the first admin account.
// The nutrient values are typical approximate values per serving. Before you
// publish the app, check them against IFCT (NIN) tables or product labels.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Food from '../src/models/Food.js';
import User from '../src/models/User.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const foods = JSON.parse(fs.readFileSync(path.join(dir, 'foods.json'), 'utf8'));

await mongoose.connect(process.env.MONGODB_URI);

for (const f of foods) {
  await Food.updateOne(
    { nameEn: f.nameEn, isVerified: true },
    { $set: { ...f, source: 'approximate typical values (verify with IFCT)', isVerified: true } },
    { upsert: true }
  );
}
console.log(`Seeded ${foods.length} foods`);

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NICKNAME } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  if (ADMIN_PASSWORD.length < 8) {
    console.log('ADMIN_PASSWORD must be at least 8 characters, admin not created');
  } else {
    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      existing.role = 'admin';
      await existing.save();
      console.log(`Existing user ${ADMIN_EMAIL} is now an admin`);
    } else {
      await User.create({
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        nickname: ADMIN_NICKNAME || 'admin',
        role: 'admin',
        emailVerified: true,
        onboarded: true,
      });
      console.log(`Admin created: ${ADMIN_EMAIL}`);
    }
  }
} else {
  console.log('No ADMIN_EMAIL / ADMIN_PASSWORD set, skipped admin creation');
}

await mongoose.disconnect();
