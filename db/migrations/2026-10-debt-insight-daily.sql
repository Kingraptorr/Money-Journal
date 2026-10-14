-- Debt insights are generated at most once per user per Tehran day (first app open of the day).
ALTER TABLE debt_insights ALTER COLUMN sentence DROP NOT NULL;
ALTER TABLE debt_insights ADD COLUMN IF NOT EXISTS last_attempt_date DATE;
