-- =============================================================
-- Everything Fitness — v1 schema
-- Run this in Supabase: SQL Editor → New query → paste → Run
-- =============================================================

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Athlete',
  sex text check (sex in ('male','female')),
  birth_year int,
  height_cm numeric,
  weight_kg numeric,
  activity_level text not null default 'moderate'
    check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal text not null default 'maintain'
    check (goal in ('fat_loss','maintain','muscle_gain','recomp')),
  units text not null default 'imperial' check (units in ('imperial','metric')),
  calorie_target int not null default 2200,
  protein_target_g int not null default 150,
  carbs_target_g int not null default 220,
  fat_target_g int not null default 70,
  water_target_ml int not null default 3000,
  split text not null default 'PPL' check (split in ('PPL','UL','FB','BRO')),
  split_day_index int not null default 0,
  streak_count int not null default 0,
  last_log_date date,
  premium_forever boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read"  on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Athlete'));
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- REDEEM CODES (no client access; Edge Function only) ----------
create table public.redeem_codes (
  code_hash text primary key,          -- sha-256 hex of the code, never plaintext
  grants text not null default 'premium_forever',
  max_uses int not null default 1,
  use_count int not null default 0,
  active boolean not null default true
);
alter table public.redeem_codes enable row level security;   -- no policies: service role only

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null references public.redeem_codes(code_hash),
  redeemed_at timestamptz not null default now(),
  unique (user_id, code_hash)
);
alter table public.redemptions enable row level security;
create policy "own redemptions" on public.redemptions for select using (auth.uid() = user_id);

-- Owner code: ERMONK → premium forever (hash of the string 'ERMONK')
insert into public.redeem_codes (code_hash, grants, max_uses)
values ('5cd810e43e56f7e22e4ad52ea53358eea84d55b0d99c6cc85343bd830fda40cd', 'premium_forever', 3);

-- ---------- FOODS ----------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  serving_desc text not null default '100 g',
  serving_grams numeric,
  kcal numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  source text not null default 'custom' check (source in ('seed','usda','custom')),
  usda_fdc_id bigint,
  owner uuid references public.profiles(id) on delete cascade  -- null = global
);
alter table public.foods enable row level security;
create policy "read global or own foods" on public.foods for select
  using (owner is null or owner = auth.uid());
create policy "insert own foods" on public.foods for insert
  with check (owner = auth.uid());

-- Seed foods (per listed serving) — instant search results before USDA is wired up
insert into public.foods (name, serving_desc, serving_grams, kcal, protein_g, carbs_g, fat_g, source) values
('Chicken Breast, cooked','100 g',100,165,31,0,3.6,'seed'),
('Chicken Thigh, cooked','100 g',100,209,26,0,10.9,'seed'),
('Ground Beef 90/10, cooked','100 g',100,217,26,0,11.7,'seed'),
('Ground Beef 80/20, cooked','100 g',100,254,26,0,17,'seed'),
('Ribeye Steak, cooked','100 g',100,291,24,0,22,'seed'),
('Sirloin Steak, cooked','100 g',100,183,27,0,7.6,'seed'),
('Ground Turkey 93/7, cooked','100 g',100,213,27,0,11.6,'seed'),
('Salmon, cooked','100 g',100,206,22,0,12,'seed'),
('Tilapia, cooked','100 g',100,128,26,0,2.7,'seed'),
('Canned Tuna in water','1 can (142 g)',142,128,28,0,1,'seed'),
('Shrimp, cooked','100 g',100,99,24,0.2,0.3,'seed'),
('Large Egg','1 egg (50 g)',50,72,6.3,0.4,4.8,'seed'),
('Egg Whites','100 g',100,52,11,0.7,0.2,'seed'),
('Greek Yogurt, nonfat','170 g cup',170,100,17,6,0.7,'seed'),
('Cottage Cheese 2%','1/2 cup (113 g)',113,90,12,5,2.5,'seed'),
('Whey Protein Scoop','1 scoop (31 g)',31,120,24,3,1.5,'seed'),
('Whole Milk','1 cup (244 g)',244,149,7.7,11.7,7.9,'seed'),
('Skim Milk','1 cup (245 g)',245,83,8.3,12.2,0.2,'seed'),
('Cheddar Cheese','1 oz (28 g)',28,113,6.4,0.9,9.3,'seed'),
('Mozzarella, part-skim','1 oz (28 g)',28,72,6.9,0.8,4.5,'seed'),
('White Rice, cooked','1 cup (158 g)',158,205,4.3,44.5,0.4,'seed'),
('Brown Rice, cooked','1 cup (195 g)',195,216,5,44.8,1.8,'seed'),
('Pasta, cooked','1 cup (140 g)',140,220,8.1,43,1.3,'seed'),
('Oats, dry','1/2 cup (40 g)',40,150,5,27,3,'seed'),
('Whole Wheat Bread','1 slice (43 g)',43,110,5,20,1.5,'seed'),
('White Bread','1 slice (28 g)',28,75,2.6,14,1,'seed'),
('Bagel, plain','1 bagel (105 g)',105,277,11,55,1.4,'seed'),
('Flour Tortilla','1 large (72 g)',72,218,5.9,35.9,5.7,'seed'),
('Potato, baked','1 medium (173 g)',173,161,4.3,36.6,0.2,'seed'),
('Sweet Potato, baked','1 medium (114 g)',114,103,2.3,23.6,0.2,'seed'),
('Quinoa, cooked','1 cup (185 g)',185,222,8.1,39.4,3.6,'seed'),
('Black Beans, cooked','1 cup (172 g)',172,227,15.2,40.8,0.9,'seed'),
('Chickpeas, cooked','1 cup (164 g)',164,269,14.5,45,4.2,'seed'),
('Lentils, cooked','1 cup (198 g)',198,230,17.9,39.9,0.8,'seed'),
('Banana','1 medium (118 g)',118,105,1.3,27,0.4,'seed'),
('Apple','1 medium (182 g)',182,95,0.5,25,0.3,'seed'),
('Orange','1 medium (131 g)',131,62,1.2,15.4,0.2,'seed'),
('Blueberries','1 cup (148 g)',148,84,1.1,21.4,0.5,'seed'),
('Strawberries','1 cup (152 g)',152,49,1,11.7,0.5,'seed'),
('Grapes','1 cup (151 g)',151,104,1.1,27.3,0.2,'seed'),
('Avocado','1/2 fruit (100 g)',100,160,2,8.5,14.7,'seed'),
('Broccoli, cooked','1 cup (156 g)',156,55,3.7,11.2,0.6,'seed'),
('Spinach, raw','2 cups (60 g)',60,14,1.7,2.2,0.2,'seed'),
('Mixed Salad Greens','2 cups (85 g)',85,15,1.2,2.9,0.2,'seed'),
('Carrots','1 cup (128 g)',128,52,1.2,12.3,0.3,'seed'),
('Green Beans, cooked','1 cup (125 g)',125,44,2.4,9.9,0.4,'seed'),
('Corn, cooked','1 cup (149 g)',149,143,5.1,31.3,2.2,'seed'),
('Peanut Butter','2 tbsp (32 g)',32,188,8,6.9,16,'seed'),
('Almonds','1 oz (28 g)',28,164,6,6.1,14.2,'seed'),
('Walnuts','1 oz (28 g)',28,185,4.3,3.9,18.5,'seed'),
('Olive Oil','1 tbsp (14 g)',14,119,0,0,13.5,'seed'),
('Butter','1 tbsp (14 g)',14,102,0.1,0,11.5,'seed'),
('Honey','1 tbsp (21 g)',21,64,0.1,17.3,0,'seed'),
('Protein Bar (typical)','1 bar (60 g)',60,220,20,23,7,'seed'),
('Rice Cakes','1 cake (9 g)',9,35,0.7,7.3,0.3,'seed'),
('Tofu, firm','100 g',100,144,17.3,2.8,8.7,'seed'),
('Hummus','2 tbsp (30 g)',30,70,2,4,5,'seed'),
('Dark Chocolate 70%','1 oz (28 g)',28,170,2.2,12.9,12.1,'seed'),
('Ice Cream, vanilla','1/2 cup (66 g)',66,137,2.3,15.6,7.3,'seed'),
('Pizza, cheese slice','1 slice (107 g)',107,285,12.2,35.7,10.4,'seed');

create index foods_name_search on public.foods using gin (to_tsvector('english', name || ' ' || coalesce(brand,'')));

create table public.favorite_foods (
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);
alter table public.favorite_foods enable row level security;
create policy "own favorites" on public.favorite_foods for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- FOOD LOG ----------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid references public.foods(id),
  name text not null,                   -- snapshot so history survives edits
  meal text not null default 'snack' check (meal in ('breakfast','lunch','dinner','snack')),
  servings numeric not null default 1,
  kcal numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  logged_on date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.food_logs enable row level security;
create policy "own food logs" on public.food_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index food_logs_user_day on public.food_logs (user_id, logged_on);

-- ---------- WATER ----------
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ml int not null,
  logged_on date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.water_logs enable row level security;
create policy "own water logs" on public.water_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index water_logs_user_day on public.water_logs (user_id, logged_on);

-- ---------- EXERCISES (global, read-only) ----------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  muscle_group text not null,
  equipment text not null default 'barbell'
);
alter table public.exercises enable row level security;
create policy "exercises readable" on public.exercises for select using (true);

insert into public.exercises (name, muscle_group, equipment) values
('Barbell Bench Press','chest','barbell'),('Incline Dumbbell Press','chest','dumbbell'),
('Cable Fly','chest','cable'),('Push-Up','chest','bodyweight'),
('Overhead Press','shoulders','barbell'),('Lateral Raise','shoulders','dumbbell'),
('Rear Delt Fly','shoulders','dumbbell'),('Arnold Press','shoulders','dumbbell'),
('Deadlift','back','barbell'),('Barbell Row','back','barbell'),
('Pull-Up','back','bodyweight'),('Lat Pulldown','back','cable'),
('Seated Cable Row','back','cable'),('Face Pull','back','cable'),
('Barbell Back Squat','legs','barbell'),('Front Squat','legs','barbell'),
('Romanian Deadlift','legs','barbell'),('Leg Press','legs','machine'),
('Walking Lunge','legs','dumbbell'),('Leg Extension','legs','machine'),
('Leg Curl','legs','machine'),('Standing Calf Raise','legs','machine'),
('Hip Thrust','glutes','barbell'),('Bulgarian Split Squat','legs','dumbbell'),
('Barbell Curl','biceps','barbell'),('Dumbbell Curl','biceps','dumbbell'),
('Hammer Curl','biceps','dumbbell'),('Preacher Curl','biceps','machine'),
('Tricep Pushdown','triceps','cable'),('Skull Crusher','triceps','barbell'),
('Overhead Tricep Extension','triceps','dumbbell'),('Dip','triceps','bodyweight'),
('Plank','core','bodyweight'),('Hanging Leg Raise','core','bodyweight'),
('Cable Crunch','core','cable'),('Ab Wheel Rollout','core','bodyweight');

-- ---------- WORKOUTS ----------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  split_day text not null,              -- e.g. 'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);
alter table public.workouts enable row level security;
create policy "own workouts" on public.workouts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null,
  reps int not null,
  weight_kg numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.workout_sets enable row level security;
create policy "own sets" on public.workout_sets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index sets_user_exercise on public.workout_sets (user_id, exercise_id, created_at);

-- ---------- BODY WEIGHT ----------
create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric not null,
  logged_on date not null default current_date,
  unique (user_id, logged_on)
);
alter table public.body_weight_logs enable row level security;
create policy "own weight logs" on public.body_weight_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- STREAK ----------
-- Called by the app after any successful log. Counts consecutive calendar days
-- with at least one log of any kind.
create or replace function public.touch_streak()
returns int language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  new_streak int;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.last_log_date = current_date then
    return p.streak_count;                              -- already counted today
  elsif p.last_log_date = current_date - 1 then
    new_streak := p.streak_count + 1;                   -- consecutive day
  else
    new_streak := 1;                                    -- streak resets
  end if;
  update public.profiles
     set streak_count = new_streak, last_log_date = current_date
   where id = auth.uid();
  return new_streak;
end $$;
