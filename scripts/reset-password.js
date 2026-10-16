import "dotenv/config";
import crypto from "node:crypto";
import { pool, query } from "../db/index.js";
import { findEmailIdentity, normalizeEmail } from "../db/accounts.js";
import { hashPassword } from "../api/services/passwords.js";
import { revokeAllSessions } from "../api/services/sessions.js";

// Admin-only recovery for email accounts (there is no self-service reset yet).
// Usage: node scripts/reset-password.js user@example.com
// Sets a random temporary password, prints it once, and signs the account out everywhere.

const rawEmail = process.argv[2];
if (!rawEmail || rawEmail.startsWith("-")) {
  console.error("Usage: node scripts/reset-password.js <email>");
  process.exit(2);
}

const email = normalizeEmail(rawEmail);
let exitCode = 0;

try {
  const identity = await findEmailIdentity(email);
  if (!identity) {
    console.error(`No email account found for ${email}. Nothing changed.`);
    exitCode = 1;
  } else {
    const temporaryPassword = crypto.randomBytes(12).toString("base64url");
    await query(`UPDATE auth_identities SET password_hash = $2 WHERE user_id = $1 AND provider = 'email'`, [
      identity.accountId,
      await hashPassword(temporaryPassword),
    ]);
    await revokeAllSessions(identity.accountId);

    console.log(`Password reset for ${email} (account ${identity.accountId}). All sessions were signed out.`);
    console.log(`Temporary password (shown once): ${temporaryPassword}`);
    console.log("Send it to the account owner over a private channel and ask them to change it after signing in.");
  }
} catch (error) {
  console.error("Reset failed:", error.message);
  exitCode = 1;
} finally {
  await pool.end();
}
process.exit(exitCode);
