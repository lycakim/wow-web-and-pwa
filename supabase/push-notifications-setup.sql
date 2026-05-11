-- ── 1. Push subscriptions table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL DEFAULT '',
    endpoint    TEXT NOT NULL,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone with the trip to manage subscriptions (same open policy as other tables)
CREATE POLICY "push_subscriptions_all" ON push_subscriptions
    FOR ALL USING (true) WITH CHECK (true);


-- ── 2. Database Webhooks ──────────────────────────────────────────────────────
-- Set these up in Supabase Dashboard → Database → Webhooks → Create new webhook
-- Point each one to: https://<project-ref>.supabase.co/functions/v1/send-push
-- Method: POST, no extra headers needed (Edge Function is public)
--
-- Webhook 1: grocery_items  — Events: INSERT, UPDATE
-- Webhook 2: expenses        — Events: INSERT
-- Webhook 3: members         — Events: INSERT, DELETE
-- Webhook 4: trips            — Events: UPDATE
