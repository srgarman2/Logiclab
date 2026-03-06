-- Phase 2: Privacy — Add optional username field to profiles
-- Users can set a custom username shown on leaderboards.
-- Falls back to first name (from display_name) instead of full name/email.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE DEFAULT NULL;
