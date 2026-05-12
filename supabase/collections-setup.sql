-- ── Collections ───────────────────────────────────────────────────────────────
-- Tracks fund collection campaigns (e.g. room downpayment, van deposit)

CREATE TABLE IF NOT EXISTS collections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    target_amount   NUMERIC(12, 2) NOT NULL,
    collector_id    UUID NOT NULL,  -- member who receives the money (no FK, members can be deleted)
    member_ids      UUID[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_all" ON collections FOR ALL USING (true) WITH CHECK (true);

-- ── Collection Payments ────────────────────────────────────────────────────────
-- Records each individual payment toward a collection

CREATE TABLE IF NOT EXISTS collection_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    from_member_id  UUID NOT NULL,  -- who paid (no FK, members can be deleted)
    amount          NUMERIC(12, 2) NOT NULL,
    note            TEXT,
    paid_at         DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logged_by_name  TEXT
);

ALTER TABLE collection_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_payments_all" ON collection_payments FOR ALL USING (true) WITH CHECK (true);
