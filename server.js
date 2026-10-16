import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
console.log('MongoDB connected');

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
