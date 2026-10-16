# Final plan: Nutrition & Health Community Tracker (MERN, English only)

**Choices:** MERN stack, college project, India, open community, English only.

## 1. Scope (what a college project can finish)

**Build:** accounts, food diary, water log, weight log, daily summary, community feed, open groups, one challenge, report/moderation.
**Skip for now:** barcode scan, wearables, payments, BMI, blood pressure/sugar, push notifications, PDF export, multi-language support.
**Rules baked in:** wellness-only disclaimer at signup, no age limit (everyone can join), private logs by default, nicknames in public, no public weight.

## 2. Tech stack (MERN)

| Layer | Choice |
|---|---|
| Frontend | React (Vite), React Router, Chart.js (react-chartjs-2), Axios |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | Email + password (bcrypt), JWT in HTTP-only cookie |
| Email | Nodemailer + Gmail SMTP (verification, reset) |
| Validation | express-validator or Zod |
| Anti-spam | express-rate-limit, hCaptcha/reCAPTCHA on signup |
| Hosting | Render/Railway free tier (API), Vercel/Netlify (client), MongoDB Atlas free tier (DB) |

## 3. Roles
- **Member:** own logs, posts, groups, challenges
- **Moderator:** report queue, hide posts, mute users (no access to health logs)
- **Admin:** everything above + ban users, assign moderators, edit food database

## 4. Database design (MongoDB collections, Mongoose models)

```
User: { email (unique), passwordHash, nickname (unique), role, emailVerified,
        status, profile: { heightCm, goalType, calorieTarget, unitSystem }, createdAt }

Food: { nameEn, aliases: [String], servingDesc, servingGrams,
        kcal, proteinG, carbsG, fatG, fiberG, source, createdBy, isVerified }
      -- text index on nameEn + aliases ("dal", "roti", "poha")

FoodLog: { userId, foodId, mealType, quantity, kcal, proteinG, carbsG, fatG,
           loggedAt, localDate }          -- nutrient snapshot per log
           -- index: { userId, localDate }

WaterLog: { userId, amountMl, loggedAt, localDate }
WeightLog: { userId, weightKg, loggedAt }

Group: { name, description, ownerId, createdAt }
GroupMember: { groupId, userId, joinedAt }          -- unique (groupId, userId)

Post: { userId, groupId (nullable), body, status, createdAt }
Comment: { postId, userId, body, status, createdAt }
Like: { postId, userId }                             -- unique (postId, userId)

Challenge: { title, metric, target, startDate, endDate, groupId (nullable) }
ChallengeParticipant: { challengeId, userId, joinedAt, showOnBoard }

Report: { reporterId, targetType, targetId, reason, status, handledBy }
Block: { blockerId, blockedId }
```

Notes:
- Store times in UTC plus a `localDate` string (YYYY-MM-DD) for day totals.
- Unknown nutrients stay `null`, not 0.
- Keep nutrient snapshots in `FoodLog` so editing a food doesn't change history.
- Reference by ObjectId (not embedding) for logs, posts and comments, since they grow without limit.
- Keep separate collections for likes and group members to enforce unique pairs with a compound unique index.

## 5. API endpoints (REST, Express routers)

- **Auth:** `POST /auth/register, /login, /logout, /verify-email, /forgot, /reset`
- **Profile:** `GET/PUT /me`, `DELETE /me` (account deletion), `GET /me/export` (CSV)
- **Foods:** `GET /foods?q=`, `POST /foods` (custom)
- **Logs:** `GET/POST/PUT/DELETE /logs/food`, `/logs/water`, `/logs/weight`
- **Summary:** `GET /summary/daily?date=`, `GET /summary/weekly` (Mongo aggregation pipeline)
- **Community:** `/posts`, `/posts/:id/comments`, `/posts/:id/like`, `/groups`, `/groups/:id/join`
- **Challenges:** `/challenges`, `/challenges/:id/join`, `/challenges/:id/board`
- **Safety:** `POST /reports`, `POST /blocks`
- **Moderation/Admin:** `/mod/reports`, `/mod/posts/:id/hide`, `/admin/users/:id/ban`, `/admin/foods`

Every private route filters by the logged-in user's ID taken from the JWT (e.g. `FoodLog.find({ userId: req.user.id })`). Never trust a user ID sent from the client.

## 6. Screens
1. Landing + disclaimer + community guidelines
2. Register / Login / Verify / Reset
3. Onboarding (nickname, units, optional goal)
4. Dashboard (today's calories, macros, water, weight trend)
5. Food diary (by day, meal sections) + food search + custom food
6. Water and weight quick-add
7. Trends (weekly charts, missing days shown as gaps)
8. Community feed, post detail
9. Groups list, group page
10. Challenges list, detail, opt-in leaderboard
11. Settings (privacy, export, delete account)
12. Moderator queue, Admin panel

## 7. Food data (English only)
- Store `nameEn` plus an `aliases` array for common spellings ("dal", "daal", "roti", "chapati", "poha") so search works for Indian foods.
- Start with ~150 common Indian foods (poha, idli, dal, roti, sabzi, thali items, chai) with values from IFCT/NIN or labelled sources.
- Seed with a Node script (`server/seed/foods.json` + `seedFoods.js`).
- Keep all UI text in one `constants` file or component props; no need for i18n libraries.

## 8. Folder structure
```
nutrition-app/
├── client/            (React + Vite)
│   └── src/{pages,components,services,context,hooks,styles}
├── server/
│   └── src/{routes,controllers,models,middleware,config,utils}
│   └── seed/{foods.json,seedFoods.js}
├── docs/
└── README.md
```

## 9. Safety rules for an open community
- No age limit, so the safe defaults apply to every user: no weight-loss goal type (only "eat balanced" / "maintain" / "track only"), no calorie target below a safe floor, no public weight, nicknames only, no direct messages between users.
- Signup shows a short note: "This app is for general wellness, not medical advice. If you are under 18, ask a parent or doctor before changing your diet."
- Do not collect real names, phone numbers or exact location.
- Guidelines ban pro-eating-disorder content, extreme diets, supplement selling, and medical advice.
- Banned-word filter and rate limits on posts; report button on every post.
- No calorie target below a safe floor, and no "lose X kg fast" features.
- Admins and moderators cannot see private logs.
- Security basics: helmet, CORS limited to the client URL, input validation, `express-mongo-sanitize` against NoSQL injection.

## 10. Build order (about 9-11 weeks part-time)

| Phase | Work | Weeks |
|---|---|---|
| 1 | Project setup, MongoDB Atlas + Mongoose models, auth + email verification | 2 |
| 2 | Food database + seed, food diary, daily summary | 2 |
| 3 | Water, weight, dashboard charts, CSV export | 2 |
| 4 | Feed, groups, reports, block, moderator tools | 3 |
| 5 | Challenge + leaderboard, polish, testing, deploy | 2 |

**Testing:** Jest + Supertest for calorie sums, date handling and API routes; check that one user can't read another's logs; trial with 5-10 classmates.

## Note on children's data (India)
India's DPDP Act 2023 requires verifiable parental consent before processing data of anyone under 18. For a college project this is fine to mention in your report as a limitation, but if the app ever goes public, add an optional date-of-birth field and a parental-consent step.

## What changed from the previous plan
- PostgreSQL SQL schema replaced by MongoDB + Mongoose models.
- i18next, Hindi and Marathi files, translated food names and language fields removed.
- Added `aliases` for English search of Indian food names.
- Hosting uses MongoDB Atlas instead of Neon/Supabase.
- Timeline trimmed by about one week.

## Next step
Say "start Phase 1" and I'll build the Express + Mongoose setup with register, login and email verification.
