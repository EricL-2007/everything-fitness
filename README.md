# Everything Fitness

Log it. Every day. That's the whole trick.

A cross-platform fitness app — nutrition, workouts, hydration, streaks, and an
AI-powered coach (Coach Er) — built with **Expo (React Native)** and **Supabase**.
One codebase runs on iOS, Android, and the web.

> ⚠️ Everything Fitness provides general fitness information, not medical advice.
> Consult a physician before starting a new diet or training program.

## Tech stack

- **Frontend:** React Native + Expo (expo-router), TypeScript, react-native-svg
- **Backend:** Supabase — Postgres with Row-Level Security, Auth, Edge Functions (Deno)
- **AI:** Claude (Anthropic API) called from a Supabase Edge Function — the API key
  never ships in the app
- **Platforms:** iOS, Android, and responsive web from a single codebase

## Features

**Accounts & onboarding**
- Email auth with auto-created profiles (self-healing if a profile row is missing)
- Onboarding: stats + goal → auto-computed calorie / macro / water targets (Mifflin-St Jeor)
- Imperial / metric units, switchable any time

**Nutrition**
- Food logging with search across a seeded database plus USDA FoodData Central
- Favorites, recents, custom foods, and per-meal logging (breakfast / lunch / dinner / snack)
- Daily calorie + macro tracking with a progress ring
- Water tracking: one-tap quick adds **and** custom amounts

**Workouts**
- Built-in splits: PPL, Upper/Lower, Full Body, Bro, Arnold, PPL×Upper/Lower, PHUL, PHAT
- **Custom plan builder** — design your own 7-day week and save multiple plans
- **Adaptive split** — the week's rotation advances on completed sessions, not calendar
  days; a "Skip today" action explicitly shifts the split forward when you can't train,
  so nothing is lost or force-crammed
- **Exercise substitutions** — swap any exercise for another that targets the same
  muscle group, filtered to what your training mode allows
- **Home vs. gym mode** — a profile-level toggle that filters the exercise picker and
  substitutions down to bodyweight/dumbbell moves when you're training at home
- **Workout mode** — rest timer with presets, a live session-duration clock, and a
  post-workout summary (duration, sets, total volume, exercises trained)
- Searchable, scrollable exercise picker; set / rep / weight logging
- Workout history

**AI Coach (Coach Er)**
- A friendly cartoon mascot whose expression reacts to your day
- Rule-based daily briefing: protein pacing, calorie drift, hydration nudges,
  missed-session split shifting, and streak milestones
- **LLM-powered chat** — ask Coach Er anything; it's backed by Claude via a Supabase
  Edge Function so your API key never touches the client
- **Memory** — the coach's system prompt is built from your goals, recent workout
  history, and recent nutrition log, and the conversation itself is persisted
  (`coach_messages`) so it picks up where you left off across app restarts

**Tracking**
- Streaks and a Today dashboard with the calorie/macro ring
- Body-weight logging with trend
- **Weekly report** — workouts completed, average calories/protein, and streak for
  the last 7 days
- **Strength progression** — a chart of your top working set over time for whichever
  lift you train most

**Language & appearance**
- Full UI in **English, Spanish, and Chinese (Simplified)** — switch anytime in
  Profile → Preferences (stored on-device, no account changes needed)
- **Light / dark mode toggle** — same switch, applies instantly across every screen

**Premium**
- Redeem-code system, validated server-side (SHA-256 hashed, never stored in plaintext)

## Setup (~15 minutes)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (or reuse an existing one).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. In a new query, paste `supabase/migration-002-plans.sql` → **Run**
   (adds the extra splits and custom-plan support).
4. In a new query, paste `supabase/migration-003-features.sql` → **Run**
   (adds home/gym mode and AI Coach chat history).
5. **Project Settings → API**: copy the Project URL and `anon` key.
6. (Recommended, dev only) **Authentication → Sign In / Providers → Email**:
   turn OFF "Confirm email" so sign-ups work instantly.

### 2. Edge Functions (optional for local dev)
The core app works with just the schema — food search falls back to the seeded
database, the redeem button and AI Coach chat are the only features that need these
deployed. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy redeem-code
supabase functions deploy food-search
supabase functions deploy coach-chat
# optional — free key from https://fdc.nal.usda.gov/api-key-signup
supabase secrets set USDA_API_KEY=your_key
# required for the AI Coach chat — get a key at https://console.anthropic.com
supabase secrets set ANTHROPIC_API_KEY=your_key
# optional — defaults to claude-opus-4-8; claude-haiku-4-5 is a cheaper/faster
# swap if you'd rather not run Opus-tier cost for a lightweight daily coach
supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5
```

### 3. App
```bash
npm install
cp .env.example .env    # then paste your Supabase URL + anon key
npx expo start
```

- **w** → web version in the browser
- Scan the QR with the **Expo Go** app for your phone
  (use `npx expo start --tunnel` if your network blocks the local connection)

## Project layout

```
app/                 expo-router screens
  (auth)/            sign-in, sign-up, onboarding
  (tabs)/            Today · Nutrition · Workout · Coach Er · Progress · Profile
  plan-builder.tsx   custom workout-plan builder
components/          UI primitives, the Today ring, the Coach Er mascot, the
                     strength-progression chart
lib/                 supabase client, theme (light/dark), i18n (en/es/zh),
                     fitness math, Coach Er rules, weekly/today aggregation
supabase/
  schema.sql                  full database schema + RLS + seed data
  migration-002-plans.sql     extra splits + custom-plan tables
  migration-003-features.sql  home/gym mode + AI Coach chat history
  functions/                  redeem-code, food-search, coach-chat (Deno Edge Functions)
```

## Security notes

- Every table uses Row-Level Security — users can only read and write their own rows.
- Redeem codes are stored as SHA-256 hashes and validated inside an Edge Function;
  no code string exists anywhere in this repository or the shipped app.
- The only keys in the client are the Supabase URL and anon key, which are
  designed to be public. Secrets like the USDA and Anthropic keys live in Edge
  Function secrets, never in the repo or the client bundle.
- Language and theme preferences are stored on-device only (AsyncStorage) — no
  extra data leaves the app for either feature.

<<<<<<< HEAD
## Status

v1 is feature-complete and runs on web, iOS, and Android via Expo. App Store /
Play Store release is planned. This repository is a portfolio project.
=======

## Status

This repository is a portfolio project, feature-complete and running on web, iOS,
and Android via Expo. App Store / Play Store release is planned.
>>>>>>> ed46622 (Describe what you changed here)
