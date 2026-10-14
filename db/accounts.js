import { pool, query, ensureDefaultCategories } from "./index.js";

const ADMIN_CACHE_MS = 60_000;
const adminCache = new Map();

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email) {
  const value = normalizeEmail(email);
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function resolveTelegramAccount(tgUser) {
  const telegramId = String(tgUser.id);
  const firstName = tgUser.first_name ?? null;
  const lastName = tgUser.last_name ?? null;
  const username = tgUser.username ?? null;

  const found = await query(
    `SELECT user_id FROM auth_identities WHERE provider = 'telegram' AND provider_user_id = $1`,
    [telegramId],
  );

  if (found.rowCount > 0) {
    const accountId = String(found.rows[0].user_id);
    await query(
      `UPDATE users SET first_name = $2, last_name = $3, username = $4
       WHERE id = $1 AND (first_name, last_name, username) IS DISTINCT FROM ($2, $3, $4)`,
      [accountId, firstName, lastName, username],
    );
    return { id: accountId };
  }

  // No identity yet: either a brand-new Telegram user, or a legacy users row (id = Telegram ID)
  // created before identities existed. Both end up with a users row and an identity row.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, first_name, last_name, username)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         username = EXCLUDED.username`,
      [telegramId, firstName, lastName, username],
    );
    await client.query(
      `INSERT INTO auth_identities (user_id, provider, provider_user_id, verified_at)
       VALUES ($1, 'telegram', $2, NOW())
       ON CONFLICT (provider, provider_user_id) DO NOTHING`,
      [telegramId, telegramId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await ensureDefaultCategories(telegramId);
  return { id: telegramId };
}

export async function createEmailAccount({ email, passwordHash, displayName }) {
  const normalized = normalizeEmail(email);
  const client = await pool.connect();
  let accountId;

  try {
    await client.query("BEGIN");
    const next = await client.query(`SELECT nextval('account_id_seq')::text AS id`);
    accountId = next.rows[0].id;
    await client.query(`INSERT INTO users (id, first_name) VALUES ($1, $2)`, [
      accountId,
      String(displayName ?? "").trim() || null,
    ]);
    await client.query(
      `INSERT INTO auth_identities (user_id, provider, provider_user_id, password_hash, verified_at)
       VALUES ($1, 'email', $2, $3, NOW())`,
      [accountId, normalized, passwordHash],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") throw new Error("email_taken");
    throw error;
  } finally {
    client.release();
  }

  await ensureDefaultCategories(accountId);
  return { id: accountId };
}

export async function findEmailIdentity(email) {
  const result = await query(
    `SELECT user_id, password_hash FROM auth_identities WHERE provider = 'email' AND provider_user_id = $1`,
    [normalizeEmail(email)],
  );
  if (result.rowCount === 0) return null;
  return { accountId: String(result.rows[0].user_id), passwordHash: result.rows[0].password_hash };
}

export async function getTelegramIdentity(accountId) {
  const result = await query(
    `SELECT provider_user_id FROM auth_identities WHERE user_id = $1 AND provider = 'telegram'`,
    [accountId],
  );
  return result.rowCount > 0 ? String(result.rows[0].provider_user_id) : null;
}

export async function isAdminAccount(accountId) {
  const adminIds = String(process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (adminIds.length === 0) return false;

  const key = String(accountId);
  const cached = adminCache.get(key);
  if (cached && Date.now() - cached.at < ADMIN_CACHE_MS) return cached.value;

  const telegramId = await getTelegramIdentity(key);
  const value = telegramId !== null && adminIds.includes(telegramId);
  adminCache.set(key, { value, at: Date.now() });
  return value;
}
