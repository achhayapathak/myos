-- ==============================================================================
-- MyOS — Security Hardening Migration
-- Migration: 20260929000001_security_hardening.sql
--
-- Updates an existing MyOS database to:
--   1. Pin search_path on the public.handle_new_user() SECURITY DEFINER trigger.
--   2. Add DEFAULT auth.uid() to user_id on all 7 user-owned tables.
--
-- Safe to execute against an already populated database (no data loss).
-- ==============================================================================

-- 1. Secure handle_new_user trigger function with pinned search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add DEFAULT auth.uid() to user_id across all user-owned tables
ALTER TABLE public.profiles ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.events ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.pomodoro_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.reminders ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.push_subscriptions ALTER COLUMN user_id SET DEFAULT auth.uid();
