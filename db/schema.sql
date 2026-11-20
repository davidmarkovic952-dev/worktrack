-- WorkTrack — shema baze (PostgreSQL 14+)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  weekly_hours  INTEGER      NOT NULL DEFAULT 40 CHECK (weekly_hours BETWEEN 1 AND 40),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_records (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time IS NULL OR end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_records_user_start ON time_records (user_id, start_time DESC);
-- največ ena odprta evidenca na zaposlenega
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_record ON time_records (user_id) WHERE end_time IS NULL;

-- Revizijska sled: samo dodajanje (append-only). Aplikacija nikoli ne izvaja UPDATE/DELETE nad to tabelo.
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  actor_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(40) NOT NULL,
  entity      VARCHAR(40) NOT NULL,
  entity_id   INTEGER,
  before      JSONB,
  after       JSONB,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity, entity_id);
