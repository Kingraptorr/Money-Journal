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
