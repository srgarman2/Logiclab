-- ── LogicLab Daily Leaderboard Migration ──────────────────────────────────────
-- Run this in the Supabase SQL Editor AFTER daily_migration.sql has been applied.
-- This adds solve time tracking and fixes the cached 10-question daily challenge.

-- ── 1. Add solve_time_ms column to daily_completions ────────────────────────

ALTER TABLE daily_completions
  ADD COLUMN IF NOT EXISTS solve_time_ms INT DEFAULT NULL;

-- ── 2. Delete today's cached challenge (it has 10 questions, we want 1) ─────
-- This forces regeneration with the new 1-question format.

DELETE FROM daily_challenges
  WHERE challenge_date = CURRENT_DATE;

-- ── 3. Done! The next time someone visits /daily, the API will generate ─────
-- a fresh 1-question hard challenge for today.
