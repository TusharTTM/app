# NutriCommunity: Nutrition & Health Community Tracker

A MERN (MongoDB, Express, React, Node) web app for logging food, water and weight, with an open, English-only community (feed, groups, challenges) and moderation tools. Built as a college project for users in India.

## Features

- Sign up, log in, email verification, password reset (JWT in an HTTP-only cookie)
- Food diary with 76 common Indian foods (search "dal", "roti", "poha"...) plus custom foods
- Water and weight logs, daily dashboard, 7-day trend charts, CSV export, account deletion
- Community feed, comments, likes, open groups, report and block
- Challenges with an opt-in leaderboard
- Roles: member, moderator (report queue, hide content, mute), admin (users, roles, food database)
- Safety: no age limit but safe defaults, calorie goal limited to 1200-4000, banned-word filter, rate limits, private health logs that no role can read

## What you need

- Node.js 18 or newer
- MongoDB: either a local install (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas cluster

## Run it locally

```bash
# 1. Server
cd server
npm install
cp .env.example .env        # then edit .env (see below)
npm run seed                # loads foods, and creates an admin if ADMIN_* are set
npm run dev                 # API on http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

In `server/.env`:

- `MONGODB_URI`: your MongoDB address (Atlas gives you one)
- `JWT_SECRET`: any long random string
- `AUTO_VERIFY_EMAIL=true`: skips email verification while developing. When it is `false`, verification and reset links are printed in the server console unless you fill in the `SMTP_*` settings (Gmail needs an "app password")
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: set these before `npm run seed` to create your first admin. Log in with them, then make moderators from the Admin page

Open http://localhost:5173 and sign up.

## Tests

```bash
cd server
npm test
```

These cover calorie sums, unknown nutrients staying empty (not zero), date handling and the safety rules.

## Folder structure

```
nutrition-app/
├── client/                React + Vite
│   └── src/{pages,components,services,context,styles}
├── server/
│   ├── src/{routes,models,middleware,utils}
│   ├── seed/{foods.json,seedFoods.js}
│   └── test/
└── README.md
```

## Main API routes (all under /api)

| Area | Routes |
|---|---|
| Auth | `POST /auth/register, /login, /logout, /verify-email, /forgot, /reset` |
| Profile | `GET/PUT/DELETE /me`, `GET /me/export` |
| Foods | `GET /foods?q=`, `POST /foods` |
| Logs | `/logs/food`, `/logs/water`, `/logs/weight` |
| Summary | `GET /summary/daily?date=`, `GET /summary/weekly?date=` |
| Community | `/posts`, `/posts/:id/comments`, `/posts/:id/like`, `/groups`, `/groups/:id/join` |
| Challenges | `/challenges`, `/challenges/:id/join`, `/challenges/:id/board` |
| Safety | `POST /reports`, `/blocks` |
| Moderation | `/mod/reports`, `/mod/reports/:id/resolve`, `/mod/users/:id/mute` |
| Admin | `/admin/users`, `/admin/users/:id/ban`, `/admin/foods` |

Every private route takes the user from the signed login cookie, never from the request body, and filters data by that user.

## Deploying (free tiers)

1. **Database:** create a MongoDB Atlas free cluster, allow access, copy the connection string.
2. **API (Render or Railway):** root directory `server`, build `npm install`, start `npm start`. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (your frontend address), `NODE_ENV=production`, `AUTO_VERIFY_EMAIL=false` and the `SMTP_*` settings.
3. **Client (Vercel or Netlify):** root directory `client`, build `npm run build`, output `dist`. Leave `VITE_API_URL` empty and add two rewrites on the host: `/api/*` to `https://your-api-address/api/*`, then everything else to `/index.html` (so page refresh works). Proxying `/api` through the frontend keeps the login cookie same-site. Without it, Safari and other browsers that block third-party cookies will log users out immediately. (Vercel: `vercel.json` rewrites. Netlify: `_redirects` file.)
4. Run `npm run seed` once against the production database (set `ADMIN_EMAIL` and `ADMIN_PASSWORD` first).

## Limitations to mention in your report

- Food values in `foods.json` are typical approximate values. Check them against the IFCT (NIN) tables or product labels before real-world use.
- With no age limit, India's DPDP Act 2023 would require parental consent for under-18 users if the app goes public. Add a date-of-birth field and a consent step before that.
- No barcode scan, wearables, payments, push notifications or direct messages (kept out of scope on purpose).
- The banned-word list is small. Moderators and the report button are the real safety net.
