-- Phase 1 Gamification Migration
-- Adds login streak tracking columns to profiles table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_date DATE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freezes INT DEFAULT 0;
