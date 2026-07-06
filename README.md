# Everything Fitness

Log it. Every day. That's the whole trick.

A cross-platform fitness app — nutrition, workouts, hydration, streaks, and a
rule-based coach (Coach Er) — built with **Expo (React Native)** and **Supabase**.
One codebase runs on iOS, Android, and the web.

> ⚠️ Everything Fitness provides general fitness information, not medical advice.
> Consult a physician before starting a new diet or training program.

## v1 features

- Email auth with auto-created profiles
- Onboarding: stats + goal → auto-computed calorie/macro/water targets (Mifflin-St Jeor)
- Food logging: USDA FoodData Central search, favorites, recents, custom foods, meals
- Water tracking with one-tap quick adds
- Workouts: PPL / Upper-Lower / Full Body / Bro splits, set-rep-weight logging,
  rest timer, split auto-advances when you finish a session
- Coach Er: rule-based daily guidance (protein pacing, calorie drift, hydration,
  missed-session split shifting, streak milestones)
- Streaks + Today dashboard with the calorie/macro ring
- Body weight logging with trend
- Redeem codes (validated server-side)

## Setup (~15 minutes)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (or reuse your account).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copy the Project URL and `anon` key.
4. (Recommended) **Authentication → Providers → Email**: turn OFF "Confirm email"
   while developing so sign-ups work instantly.

### 2. Edge Functions
Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy redeem-code
supabase functions deploy food-search
# optional but recommended — free key from https://fdc.nal.usda.gov/api-key-signup
supabase secrets set USDA_API_KEY=your_key
```

Without a USDA key the search falls back to `DEMO_KEY` (rate-limited, fine for dev).

### 3. App
```bash
npm install
cp .env.example .env    # then paste your Supabase URL + anon key
npx expo start
```

- **i** → iOS simulator, or scan the QR with the Expo Go app on your phone
- **w** → web version in the browser

## Project layout

```
app/                 expo-router screens
  (auth)/            sign-in, sign-up, onboarding
  (tabs)/            Today · Nutrition · Workout · Coach Er · Profile
components/          UI primitives + the Today ring
lib/                 supabase client, theme tokens, fitness math, Coach Er rules
supabase/
  schema.sql         full database schema + RLS + seed data
  functions/         redeem-code, food-search (Deno Edge Functions)
```

## Security notes

- All tables use Row-Level Security — users can only touch their own rows.
- Redeem codes are stored as SHA-256 hashes and validated in an Edge Function;
  no code string exists anywhere in this repository or the shipped app.
- The only keys in the client are the Supabase URL and anon key, which are
  designed to be public. The USDA key lives in Edge Function secrets.

## Roadmap

v1 (this) → v2 (LLM Coach Er, photo food logging, barcode scanning, adaptive
splits, premium) → v3 (personalization, community) → v3.5 (cardio) → v4 (fitness RPG).
