-- ==============================================================================
-- MyOS — Habits & Habit Completions Schema Migration
-- Migration: 20261004000000_habits.sql
--
-- Tables:
--   1. habits
--   2. habit_completions
--
-- Security Rules:
--   - Both tables have Row Level Security (RLS) enabled.
--   - habits policies enforce auth.uid() = user_id for SELECT, INSERT, UPDATE, DELETE.
--   - habit_completions policies enforce auth.uid() = user_id AND ensure the associated
--     habit belongs to auth.uid() across INSERT, UPDATE, and DELETE.
--   - Client-supplied user_id is never trusted (defaults to auth.uid()).
--   - Unique constraint (habit_id, completed_on) guarantees idempotency.
-- ==============================================================================

-- 1. HABITS TABLE
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly')),
  target_days INTEGER[],
  color TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits_select_own"
  ON public.habits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "habits_insert_own"
  ON public.habits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_update_own"
  ON public.habits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_delete_own"
  ON public.habits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for habits
CREATE INDEX IF NOT EXISTS idx_habits_user_id
  ON public.habits (user_id);

CREATE INDEX IF NOT EXISTS idx_habits_user_archived
  ON public.habits (user_id, archived);

CREATE INDEX IF NOT EXISTS idx_habits_user_created
  ON public.habits (user_id, created_at ASC);

CREATE TRIGGER set_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. HABIT COMPLETIONS TABLE
CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_habit_completions_habit_date UNIQUE (habit_id, completed_on)
);

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_completions_select_own"
  ON public.habit_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "habit_completions_insert_own"
  ON public.habit_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "habit_completions_update_own"
  ON public.habit_completions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "habit_completions_delete_own"
  ON public.habit_completions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  );

-- Indexes for habit_completions
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id
  ON public.habit_completions (user_id);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id
  ON public.habit_completions (habit_id);

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date
  ON public.habit_completions (user_id, completed_on DESC);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON public.habit_completions (habit_id, completed_on DESC);
