-- ==============================================================================
-- Migration: 20261003000000_notification_deliveries.sql
-- Description: Database abstraction for Web Push notification delivery queue & logs.
-- Separates notification delivery from reminder domain data.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'web_push',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_notification_delivery_status CHECK (
    status IN ('pending', 'delivered', 'failed', 'cancelled')
  ),
  CONSTRAINT chk_notification_delivery_channel CHECK (
    channel IN ('web_push', 'in_app')
  )
);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_deliveries_select_own"
  ON public.notification_deliveries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notification_deliveries_insert_own"
  ON public.notification_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_deliveries_update_own"
  ON public.notification_deliveries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_deliveries_delete_own"
  ON public.notification_deliveries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for efficient queue polling by future workers & user queries
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id
  ON public.notification_deliveries(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_reminder_id
  ON public.notification_deliveries(reminder_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_queue
  ON public.notification_deliveries(status, scheduled_at)
  WHERE status = 'pending';

CREATE TRIGGER set_notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
