-- ==============================================================================
-- Migration: 20261005000000_locked_notes.sql
-- Description: Adds password-protected locking feature for notes.
-- Allows locking specific notes with a password.
-- ==============================================================================

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;

-- Index for efficient querying by user and lock status
CREATE INDEX IF NOT EXISTS idx_notes_user_locked
  ON public.notes(user_id, is_locked);
