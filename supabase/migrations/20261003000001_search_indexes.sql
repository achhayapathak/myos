-- ==============================================================================
-- Migration: 20261003000001_search_indexes.sql
-- Description: PostgreSQL search optimization indexes for global search.
-- Enables fast trigram pattern matching across tasks, notes, and calendar events.
-- ==============================================================================

-- Enable trigram extension for efficient substring / pattern searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Tasks text search indexes (title and description)
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
  ON public.tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_description_trgm
  ON public.tasks USING gin (description gin_trgm_ops);

-- 2. Notes text search indexes (title and content)
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm
  ON public.notes USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_notes_content_trgm
  ON public.notes USING gin (content gin_trgm_ops);

-- 3. Calendar events text search indexes (title and description)
CREATE INDEX IF NOT EXISTS idx_events_title_trgm
  ON public.events USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_events_description_trgm
  ON public.events USING gin (description gin_trgm_ops);
