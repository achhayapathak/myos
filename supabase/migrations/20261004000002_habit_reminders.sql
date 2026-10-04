-- ==============================================================================
-- MyOS — Habit Notifications & Per-Habit Reminder Time Schema Migration
-- Migration: 20261004000002_habit_reminders.sql
--
-- Alterations:
--   1. habits: Add optional reminder_time TEXT column with HH:mm 24-hr format check.
--   2. profiles: Add habit notification settings (enabled, morning_time, evening_time).
-- ==============================================================================

-- 1. Add reminder_time to habits table
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS reminder_time TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_habits_reminder_time'
  ) THEN
    ALTER TABLE public.habits
      ADD CONSTRAINT chk_habits_reminder_time
      CHECK (reminder_time IS NULL OR reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;

-- Index for querying habits by reminder time
CREATE INDEX IF NOT EXISTS idx_habits_user_reminder_time
  ON public.habits (user_id, reminder_time)
  WHERE reminder_time IS NOT NULL;

-- 2. Add habit notification preference columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS habit_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS habit_morning_time TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS habit_evening_time TEXT DEFAULT '20:00';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_habit_morning_time'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_habit_morning_time
      CHECK (habit_morning_time IS NULL OR habit_morning_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_habit_evening_time'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_habit_evening_time
      CHECK (habit_evening_time IS NULL OR habit_evening_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;
