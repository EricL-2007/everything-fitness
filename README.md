# Everything Fitness

Log it. Every day. That's the whole trick.

A cross-platform fitness app — nutrition, workouts, hydration, streaks, and a
rule-based coach (Coach Er) — built with **Expo (React Native)** and **Supabase**.
One codebase runs on iOS, Android, and the web.

> ⚠️ Everything Fitness provides general fitness information, not medical advice.
> Consult a physician before starting a new diet or training program.

## Tech stack

- **Frontend:** React Native + Expo (expo-router), TypeScript, react-native-svg
- **Backend:** Supabase — Postgres with Row-Level Security, Auth, Edge Functions (Deno)
- **Platforms:** iOS, Android, and responsive web from a single codebase

## v1 features

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
- Searchable, scrollable exercise picker; set / rep / weight logging
- Rest timer with presets; the split auto-advances when you finish a session
- Workout history

**Coach Er**
- A friendly cartoon mascot whose expression reacts to your day
- Rule-based daily guidance: protein pacing, calorie drift, hydration nudges,
  missed-session split shifting, and streak milestones

**Tracking**
- Streaks and a Today dashboard with the calorie/macro ring
- Body-weight logging with trend

**Premium**
- Redeem-code system, validated server-side (SHA-256 hashed, never stored in plaintext)

## Setup (~15 minutes)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (or reuse an existing one).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. In a new query, paste `supabase/migration-002-plans.sql` → **Run**
   (adds the extra splits and custom-plan support).
4. **Project Settings → API**: copy the Project URL and `anon` key.
5. (Recommended, dev only) **Authentication → Sign In / Providers → Email**:
   turn OFF "Confirm email" so sign-ups work instantly.

### 2. Edge Functions (optional for local dev)
The core app works with just the schema — food search falls back to the seeded
database, and the redeem button is the only feature that needs these deployed.
Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy redeem-code
supabase functions deploy food-search
# optional — free key from https://fdc.nal.usda.gov/api-key-signup
supabase secrets set USDA_API_KEY=your_key
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
  (tabs)/            Today · Nutrition · Workout · Coach Er · Profile
  plan-builder.tsx   custom workout-plan builder
components/          UI primitives, the Today ring, the Coach Er mascot
lib/                 supabase client, theme tokens, fitness math, Coach Er rules
supabase/
  schema.sql                  full database schema + RLS + seed data
  migration-002-plans.sql     extra splits + custom-plan tables
  functions/                  redeem-code, food-search (Deno Edge Functions)
```

## Security notes

- Every table uses Row-Level Security — users can only read and write their own rows.
- Redeem codes are stored as SHA-256 hashes and validated inside an Edge Function;
  no code string exists anywhere in this repository or the shipped app.
- The only keys in the client are the Supabase URL and anon key, which are
  designed to be public. Secrets like the USDA key live in Edge Function secrets,
  never in the repo.

## Roadmap

v1 (this) → v2 (LLM-powered Coach Er, photo food logging, barcode scanning,
adaptive splits, premium paywall) → v3 (deeper personalization, community) →
v3.5 (cardio) → v4 (fitness RPG).

## Status

v1 is feature-complete and runs on web, iOS, and Android via Expo. App Store /
Play Store release is planned. This repository is a portfolio project.