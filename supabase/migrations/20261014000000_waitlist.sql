-- Waitlist table for invite-only access management
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_at TIMESTAMPTZ NULL,
  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_status_check CHECK (status IN ('pending', 'invited', 'joined'))
);

-- Enable Row Level Security — no public access policies
-- Only the service-role key (admin client) can read/write this table
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Rate limiting table to track submission attempts by IP hash
CREATE TABLE IF NOT EXISTS waitlist_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE waitlist_rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for efficient rate limit lookups by IP and time window
CREATE INDEX IF NOT EXISTS idx_waitlist_rate_limits_ip_created
  ON waitlist_rate_limits (ip_hash, created_at DESC);
