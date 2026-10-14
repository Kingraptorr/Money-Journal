-- Additive: attempts counter and kind so code-entry challenges can share login_requests.
ALTER TABLE login_requests ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE login_requests ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'approval';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_requests_kind_check') THEN
    ALTER TABLE login_requests ADD CONSTRAINT login_requests_kind_check CHECK (kind IN ('approval', 'code_challenge'));
  END IF;
END $$;
