import crypto from "node:crypto";
import { pool, query } from "./index.js";
import { DEFAULT_CATEGORIES } from "./defaultCategories.js";
import { normalizeEmail } from "./accounts.js";

const LINK_TTL_MINUTES = 10;
const DEFAULTS_BY_KEY = new Map(DEFAULT_CATEGORIES.map((category) => [category.key, category]));

function appSecret() {
  return process.env.JWT_SECRET || process.env.TELEGRAM_BOT_TOKEN;
}

function tokenHash(token) {
  return crypto.createHmac("sha256", appSecret()).update(String(token)).digest("hex");
}

export function isLinkToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20}$/.test(value);
}

// "Has data" is deliberately strict: anything a person could miss if the account row vanished
// counts, including soft-deleted rows, reports, and edited categories. Only untouched default
// categories and counters are treated as empty. Update this when a new user-owned table is added.
export async function accountDataSummary(runner, accountId) {
  const counts = await runner.query(
    `SELECT (SELECT COUNT(*) FROM expenses WHERE user_id = $1)::int AS expenses,
            (SELECT COUNT(*) FROM debts WHERE user_id = $1)::int AS debts,
            (SELECT COUNT(*) FROM ai_reports WHERE user_id = $1)::int AS reports`,
    [accountId],
  );
  const categories = await runner.query(`SELECT key, label, color, is_default FROM categories WHERE user_id = $1`, [accountId]);
  const customCategories = categories.rows.filter((row) => {
    const original = DEFAULTS_BY_KEY.get(row.key);
    return !row.is_default || !original || original.label !== row.label || original.color !== row.color;
  }).length;

  const { expenses, debts, reports } = counts.rows[0];
  return { expenses, debts, reports, customCategories, hasData: expenses + debts + reports + customCategories > 0 };
}

async function identitiesOf(runner, accountId) {
  const result = await runner.query(`SELECT provider, provider_user_id FROM auth_identities WHERE user_id = $1`, [accountId]);
  return {
    email: result.rows.find((row) => row.provider === "email")?.provider_user_id ?? null,
    telegram: result.rows.find((row) => row.provider === "telegram")?.provider_user_id ?? null,
  };
}

export async function issueLinkToken(accountId) {
  const identities = await identitiesOf({ query }, accountId);
  if (!identities.email) throw new Error("no_email_login");
  if (identities.telegram) throw new Error("already_linked");

  const token = crypto.randomBytes(15).toString("base64url");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE one_time_codes SET consumed_at = NOW()
       WHERE purpose = 'link_telegram' AND user_id = $1 AND consumed_at IS NULL`,
      [accountId],
    );
    await client.query(
      `INSERT INTO one_time_codes (purpose, user_id, code_hash, expires_at)
       VALUES ('link_telegram', $1, $2, NOW() + ($3 || ' minutes')::interval)`,
      [accountId, tokenHash(token), String(LINK_TTL_MINUTES)],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { token, expiresInSeconds: LINK_TTL_MINUTES * 60 };
}

// Read-only: what would happen if this Telegram account confirmed this link token.
export async function previewLink(token, telegramId) {
  if (!isLinkToken(token)) return null;
  const code = await query(
    `SELECT id, user_id FROM one_time_codes
     WHERE purpose = 'link_telegram' AND code_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()`,
    [tokenHash(token)],
  );
  if (code.rowCount === 0) return null;

  const emailAccountId = String(code.rows[0].user_id);
  const telegram = await query(
    `SELECT user_id FROM auth_identities WHERE provider = 'telegram' AND provider_user_id = $1`,
    [String(telegramId)],
  );
  if (telegram.rowCount === 0) return null;
  const telegramAccountId = String(telegram.rows[0].user_id);

  const emailIdentities = await identitiesOf({ query }, emailAccountId);
  const telegramIdentities = await identitiesOf({ query }, telegramAccountId);
  const emailSide = await accountDataSummary({ query }, emailAccountId);
  const telegramSide = await accountDataSummary({ query }, telegramAccountId);

  let blocked = null;
  if (telegramAccountId === emailAccountId || emailIdentities.telegram) blocked = "already_linked";
  else if (!emailIdentities.email) blocked = "invalid_link";
  else if (telegramIdentities.email) blocked = "telegram_account_has_email";
  else if (emailSide.hasData && telegramSide.hasData) blocked = "both_have_data";

  return { codeId: code.rows[0].id, email: emailIdentities.email, emailSide, telegramSide, blocked };
}

async function moveBotUsage(client, fromId, toId) {
  await client.query(
    `INSERT INTO bot_usage_daily (user_id, usage_date, count)
     SELECT $2, usage_date, count FROM bot_usage_daily WHERE user_id = $1
     ON CONFLICT (user_id, usage_date) DO UPDATE SET count = bot_usage_daily.count + EXCLUDED.count`,
    [fromId, toId],
  );
}

async function deleteEmptyAccount(client, accountId) {
  const summary = await accountDataSummary(client, accountId);
  if (summary.hasData) throw new Error("refusing_to_delete_account_with_data");
  const removed = await client.query(`DELETE FROM users WHERE id = $1`, [accountId]);
  if (removed.rowCount !== 1) throw new Error("account_delete_failed");
}

// Everything happens in one transaction under row locks; any doubt rolls back and changes nothing.
export async function completeLink(codeId, telegramId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const code = await client.query(
      `SELECT id, user_id FROM one_time_codes
       WHERE id = $1 AND purpose = 'link_telegram' AND consumed_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [codeId],
    );
    if (code.rowCount === 0) {
      await client.query("ROLLBACK");
      return { result: "invalid_link" };
    }
    const emailAccountId = String(code.rows[0].user_id);

    const telegram = await client.query(
      `SELECT user_id FROM auth_identities WHERE provider = 'telegram' AND provider_user_id = $1`,
      [String(telegramId)],
    );
    if (telegram.rowCount === 0) {
      await client.query("ROLLBACK");
      return { result: "invalid_link" };
    }
    const telegramAccountId = String(telegram.rows[0].user_id);

    if (telegramAccountId === emailAccountId) {
      await client.query("ROLLBACK");
      return { result: "already_linked" };
    }

    const [first, second] = [emailAccountId, telegramAccountId].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
    const locked = await client.query(`SELECT id FROM users WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`, [first, second]);
    if (locked.rowCount !== 2) {
      await client.query("ROLLBACK");
      return { result: "invalid_link" };
    }

    const emailIdentities = await identitiesOf(client, emailAccountId);
    const telegramIdentities = await identitiesOf(client, telegramAccountId);
    if (!emailIdentities.email) {
      await client.query("ROLLBACK");
      return { result: "invalid_link" };
    }
    if (emailIdentities.telegram) {
      await client.query("ROLLBACK");
      return { result: "already_linked" };
    }
    if (telegramIdentities.email) {
      await client.query("ROLLBACK");
      return { result: "telegram_account_has_email" };
    }

    const emailSide = await accountDataSummary(client, emailAccountId);
    const telegramSide = await accountDataSummary(client, telegramAccountId);
    if (emailSide.hasData && telegramSide.hasData) {
      await client.query("ROLLBACK");
      return { result: "both_have_data", emailSide, telegramSide };
    }

    await client.query(`UPDATE one_time_codes SET consumed_at = NOW() WHERE id = $1`, [codeId]);

    let survivorId;
    let absorbedId;
    if (telegramSide.hasData && !emailSide.hasData) {
      // The Telegram account keeps its ID and data; the (empty) email account's login moves onto it.
      survivorId = telegramAccountId;
      absorbedId = emailAccountId;
      const moved = await client.query(
        `UPDATE auth_identities SET user_id = $1 WHERE provider = 'email' AND user_id = $2`,
        [survivorId, absorbedId],
      );
      if (moved.rowCount !== 1) throw new Error("identity_move_failed");
    } else {
      // The email account survives (it has the data, or neither side does).
      survivorId = emailAccountId;
      absorbedId = telegramAccountId;
      const moved = await client.query(
        `UPDATE auth_identities SET user_id = $1 WHERE provider = 'telegram' AND provider_user_id = $2 AND user_id = $3`,
        [survivorId, String(telegramId), absorbedId],
      );
      if (moved.rowCount !== 1) throw new Error("identity_move_failed");
    }

    await moveBotUsage(client, absorbedId, survivorId);
    await deleteEmptyAccount(client, absorbedId);
    await client.query("COMMIT");

    return {
      result: "linked",
      survivor: survivorId === emailAccountId ? "email" : "telegram",
      email: emailIdentities.email,
      accountId: survivorId,
      absorbedAccountId: absorbedId,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// "Add email to a Telegram account": no second account is involved, so nothing can be merged or lost.
export async function addEmailToAccount({ accountId, email, passwordHash }) {
  const normalized = normalizeEmail(email);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [accountId]);
    const identities = await identitiesOf(client, accountId);
    if (!identities.telegram) throw new Error("no_telegram_login");
    if (identities.email) throw new Error("already_has_email");

    try {
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_user_id, password_hash, verified_at)
         VALUES ($1, 'email', $2, $3, NOW())`,
        [accountId, normalized, passwordHash],
      );
    } catch (error) {
      if (error.code === "23505") {
        await client.query("ROLLBACK");
        throw new Error("email_taken");
      }
      throw error;
    }
    await client.query("COMMIT");
    return { telegramId: identities.telegram };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
