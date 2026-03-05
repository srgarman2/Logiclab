-- ============================================================================
-- LogicLab — Supabase Migration
-- Paste this into your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- ── 1. Profiles ─────────────────────────────────────────────────────────────

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  avatar_url            text,
  email                 text,
  friend_code           text unique default substr(md5(random()::text), 1, 8),
  quiz_high_score       int not null default 0,
  quiz_longest_streak   int not null default 0,
  quiz_total_played     int not null default 0,
  total_xp              int not null default 0,
  streak_shields        int not null default 0,
  category_mastery      jsonb not null default '{
    "indicator-words":   {"correct":0,"attempted":0},
    "formal-logic":      {"correct":0,"attempted":0},
    "argument-analysis": {"correct":0,"attempted":0},
    "flaw-detection":    {"correct":0,"attempted":0}
  }'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();


-- ── 2. Quiz Results ─────────────────────────────────────────────────────────

create table public.quiz_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  score         int not null,
  max_streak    int not null,
  category      text not null,
  question_ids  text[] not null,
  answers       jsonb not null,
  played_at     timestamptz not null default now()
);

create index quiz_results_user_id_idx   on public.quiz_results(user_id);
create index quiz_results_played_at_idx on public.quiz_results(played_at desc);


-- ── 3. Friendships ──────────────────────────────────────────────────────────

create table public.friendships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  friend_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, friend_id)
);

create index friendships_user_id_idx   on public.friendships(user_id);
create index friendships_friend_id_idx on public.friendships(friend_id);


-- ── 4. Auto-create profile on sign-up ───────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 5. Weekly Leaderboard View ──────────────────────────────────────────────

create or replace view public.weekly_leaderboard as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.email,
  p.friend_code,
  coalesce(w.weekly_score, 0)   as weekly_score,
  coalesce(w.weekly_streak, 0)  as weekly_streak,
  coalesce(w.weekly_games, 0)   as weekly_games,
  p.quiz_high_score             as all_time_score,
  p.quiz_longest_streak         as all_time_streak,
  p.quiz_total_played           as all_time_games,
  p.total_xp,
  p.category_mastery
from public.profiles p
left join lateral (
  select
    sum(qr.score)::int      as weekly_score,
    max(qr.max_streak)::int as weekly_streak,
    count(*)::int            as weekly_games
  from public.quiz_results qr
  where qr.user_id = p.id
    and qr.played_at >= now() - interval '7 days'
) w on true;


-- ── 6. Row Level Security ───────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.quiz_results enable row level security;
alter table public.friendships enable row level security;

-- Profiles: anyone can read (for leaderboard), only owner can update
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Quiz results: anyone can read (for leaderboard), only owner can insert
create policy "Quiz results are viewable by everyone"
  on public.quiz_results for select using (true);

create policy "Users can insert own quiz results"
  on public.quiz_results for insert with check (auth.uid() = user_id);

-- Friendships: users can read their own, insert/delete their own
create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can add friendships"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own friendships"
  on public.friendships for delete
  using (auth.uid() = user_id);
