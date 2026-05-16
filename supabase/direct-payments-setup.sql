-- ── Direct Payments ────────────────────────────────────────────────────────────
-- Records peer-to-peer settlement payments made outside of a collection.
-- Used when groups skip pre-trip collection and just settle up directly.

CREATE TABLE IF NOT EXISTS direct_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    from_id         UUID NOT NULL,  -- who paid (no FK, members can be deleted)
    to_id           UUID NOT NULL,  -- who received
    amount          NUMERIC(12, 2) NOT NULL,
    note            TEXT,
    paid_at         DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_by_name  TEXT
);

ALTER TABLE direct_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "direct_payments_all" ON direct_payments FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE direct_payments;
