import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import { globalLimiter, authLimiter } from './middleware/limiters.js';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import foodRoutes from './routes/foods.js';
import logRoutes from './routes/logs.js';
import summaryRoutes from './routes/summary.js';
import postRoutes from './routes/posts.js';
import groupRoutes from './routes/groups.js';
import challengeRoutes from './routes/challenges.js';
import { reportRouter, blockRouter } from './routes/safety.js';
import modRoutes from './routes/mod.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.set('trust proxy', 1); // needed behind Render/Railway so rate limits see real IPs

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . keys (NoSQL injection)
app.use('/api', globalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/reports', reportRouter);
app.use('/api/blocks', blockRouter);
app.use('/api/mod', modRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

export default app;
