-- ── LogicLab Daily Challenge Migration ────────────────────────────────────────
-- Paste this into the Supabase SQL Editor and click Run.
-- Run AFTER the original migration.sql has been applied.

-- ── 1. Daily challenges table (one row per calendar day) ──────────────────────

CREATE TABLE IF NOT EXISTS daily_challenges (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE        UNIQUE NOT NULL,
  category       TEXT        NOT NULL,
  questions      JSONB       NOT NULL,   -- array of 10 QuizQuestion objects
  generated_by   TEXT        NOT NULL DEFAULT 'claude-haiku',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date
  ON daily_challenges (challenge_date DESC);

-- ── 2. Daily completions table (one row per user per day) ─────────────────────

CREATE TABLE IF NOT EXISTS daily_completions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_date DATE        NOT NULL,
  score          INT         NOT NULL DEFAULT 0,
  max_streak     INT         NOT NULL DEFAULT 0,
  answers        JSONB       NOT NULL DEFAULT '[]',
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_completions_user
  ON daily_completions (user_id, challenge_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_completions_date
  ON daily_completions (challenge_date DESC);

-- ── 3. Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE daily_challenges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read daily_challenges"
  ON daily_challenges FOR SELECT USING (true);

CREATE POLICY "Service insert daily_challenges"
  ON daily_challenges FOR INSERT WITH CHECK (true);

CREATE POLICY "Users read own daily_completions"
  ON daily_completions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own daily_completion"
  ON daily_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 4. Add new categories to profiles default + backfill existing rows ─────────

ALTER TABLE profiles
  ALTER COLUMN category_mastery
  SET DEFAULT '{
    "indicator-words":   {"correct": 0, "attempted": 0},
    "formal-logic":      {"correct": 0, "attempted": 0},
    "argument-analysis": {"correct": 0, "attempted": 0},
    "flaw-detection":    {"correct": 0, "attempted": 0},
    "assumption":        {"correct": 0, "attempted": 0},
    "strengthen-weaken": {"correct": 0, "attempted": 0},
    "inference":         {"correct": 0, "attempted": 0}
  }'::jsonb;

UPDATE profiles
SET category_mastery = category_mastery
  || '{"assumption":        {"correct": 0, "attempted": 0},
       "strengthen-weaken": {"correct": 0, "attempted": 0},
       "inference":         {"correct": 0, "attempted": 0}}'::jsonb
WHERE NOT (category_mastery ? 'assumption');
