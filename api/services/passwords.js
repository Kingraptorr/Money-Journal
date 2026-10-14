import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const COST = { N: 16384, r: 8, p: 1 };
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "password", "password1", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123",
  "11111111", "00000000", "iloveyou", "abc12345", "12341234", "987654321", "asdfghjk",
]);

export function validatePassword(password) {
  if (typeof password !== "string") return "weak_password";
  if (password.length < MIN_LENGTH || password.length > MAX_LENGTH) return "weak_password";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "weak_password";
  return null;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, COST);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), derived.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  const [scheme, n, r, p, saltB64, hashB64] = String(stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const derived = await scrypt(String(password), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

let dummyHashPromise = null;

// Used when the email is unknown so response time doesn't reveal whether an account exists.
export async function verifyAgainstDummy(password) {
  dummyHashPromise ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(password, await dummyHashPromise);
  return false;
}
