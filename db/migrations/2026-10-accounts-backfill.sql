-- Idempotent: gives every existing Telegram-originated user a Telegram identity
-- (provider_user_id = users.id). Only users with no identity at all are touched, so
-- email-originated accounts (which have an email identity) never receive a bogus one.
-- Safe to re-run; also self-heals users created between the first run and the code switch.
INSERT INTO auth_identities (user_id, provider, provider_user_id, verified_at, created_at)
SELECT u.id, 'telegram', u.id::text, NOW(), COALESCE(u.created_at, NOW())
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM auth_identities a WHERE a.user_id = u.id)
ON CONFLICT (provider, provider_user_id) DO NOTHING;
