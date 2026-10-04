-- ==============================================================================
-- MyOS — Pomodoro Session Pause & Resume Support
-- Migration: 20261004000001_pomodoro_pause.sql
--
-- Adds optional paused_at TIMESTAMPTZ column to pomodoro_sessions to record
-- pause events and allow sessions to be resumed accurately across devices.
-- ==============================================================================

ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
