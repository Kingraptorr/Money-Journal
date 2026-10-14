CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRT',
  category TEXT NOT NULL,
  merchant TEXT,
  note TEXT,
  expense_date DATE NOT NULL,
  raw_input TEXT,
  gemini_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, key)
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('summary', 'deeper')),
  content TEXT NOT NULL,
  has_data BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_created ON ai_reports(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_month ON ai_reports(user_id, month, created_at);

CREATE TABLE IF NOT EXISTS currency_rates (
  code TEXT PRIMARY KEY,
  name_fa TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fiat', 'gold', 'crypto')),
  sell NUMERIC(18, 2),
  buy NUMERIC(18, 2),
  change NUMERIC(18, 2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRT',
  installment_count INTEGER NOT NULL,
  start_date DATE NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);

CREATE TABLE IF NOT EXISTS debt_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  paid_at TIMESTAMPTZ,
  UNIQUE (debt_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_debt_installments_debt ON debt_installments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_installments_due ON debt_installments(due_date) WHERE paid_at IS NULL;

CREATE TABLE IF NOT EXISTS debt_insights (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  overdue_count INTEGER NOT NULL,
  overdue_total NUMERIC(14, 2) NOT NULL,
  due_soon_count INTEGER NOT NULL,
  due_soon_total NUMERIC(14, 2) NOT NULL,
  remaining_balance NUMERIC(14, 2) NOT NULL,
  sentence TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_usage_daily (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

CREATE SEQUENCE IF NOT EXISTS account_id_seq START 5000000000000000;

CREATE TABLE IF NOT EXISTS auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram', 'email')),
  provider_user_id TEXT NOT NULL,
  password_hash TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS one_time_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose TEXT NOT NULL CHECK (purpose IN ('web_login', 'link_telegram', 'verify_email', 'reset_password')),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_time_codes_lookup ON one_time_codes(purpose, code_hash);

CREATE TABLE IF NOT EXISTS login_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'claimed', 'expired')),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  device_label TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'approval' CHECK (kind IN ('approval', 'code_challenge')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_requests_expires ON login_requests(expires_at);
