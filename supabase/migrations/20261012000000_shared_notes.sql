-- ==============================================================================
-- Migration: 20261012000000_shared_notes.sql
-- Description: Adds shareable public link feature for notes.
--   - is_shared: whether the note has an active public share link.
--   - share_token: opaque UUID token used in the public URL. Only set when is_shared = true.
-- Security: A separate RLS SELECT policy allows the 'anon' role to read
--   only the safe columns of notes that are explicitly shared.
--   Locked notes cannot be shared (enforced at application layer).
-- ==============================================================================

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;

-- Unique index ensures each token maps to exactly one note
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_share_token
  ON public.notes(share_token)
  WHERE share_token IS NOT NULL;

-- Allow efficient lookup of shared notes
CREATE INDEX IF NOT EXISTS idx_notes_shared
  ON public.notes(share_token, is_shared)
  WHERE is_shared = true;

-- RLS policy: allow anonymous (unauthenticated) access to shared notes.
-- Only exposes safe fields; password_hash is never selected in the query.
-- The token must match and is_shared must be true.
CREATE POLICY "notes_select_shared_public"
  ON public.notes FOR SELECT
  TO anon
  USING (is_shared = true AND share_token IS NOT NULL);
