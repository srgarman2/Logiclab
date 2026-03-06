-- Phase 3: Add username to weekly_leaderboard view
-- Recreates the view so username is visible for name resolution.

create or replace view public.weekly_leaderboard as
select
  p.id,
  p.display_name,
  p.username,
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
