-- ==============================================================================
-- Migration: 20261003000002_performance_indexes.sql
-- Description: Targeted composite and partial indexes for hot query paths:
--   1. Tasks: composite indexes on (user_id, status, due_at), (user_id, priority, status),
--      (user_id, status, completed_at), and (user_id, created_at DESC).
--   2. Reminders: composite index on (user_id, completed, remind_at).
--   3. Pomodoro: partial index on active sessions (ended_at IS NULL).
-- ==============================================================================

-- 1. Tasks: Hot path for Today & Tasks views
-- Speeds up filtering incomplete tasks due on/before today
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
  ON public.tasks (user_id, status, due_at);

-- Speeds up high-priority incomplete task queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority_status
  ON public.tasks (user_id, priority, status);

-- Speeds up today completed tasks count aggregation
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_completed
  ON public.tasks (user_id, status, completed_at DESC);

-- Speeds up tasks listing ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_tasks_user_created
  ON public.tasks (user_id, created_at DESC);

-- 2. Reminders: Speeds up ordered reminders retrieval (uncompleted first, then by remind_at)
CREATE INDEX IF NOT EXISTS idx_reminders_user_completed_remind
  ON public.reminders (user_id, completed, remind_at);

-- 3. Pomodoro: Partial index for instant lookups of active (in-progress) sessions
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_active
  ON public.pomodoro_sessions (user_id)
  WHERE ended_at IS NULL;
