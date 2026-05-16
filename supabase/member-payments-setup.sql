-- ── Member Payments ──────────────────────────────────────────────────────────
-- Records advance payments made by a member toward their own share of the trip.
-- Used to track pre-trip payments without needing a collection.

CREATE TABLE IF NOT EXISTS member_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL,  -- who paid (no FK, members can be deleted)
    amount          NUMERIC(12, 2) NOT NULL,
    note            TEXT,
    paid_at         DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_by_name  TEXT
);

ALTER TABLE member_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_payments_all" ON member_payments FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE member_payments;
