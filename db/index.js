import "dotenv/config";
import pg from "pg";
import { DEFAULT_CATEGORIES } from "./defaultCategories.js";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function upsertUser(user) {
  await query(
    `INSERT INTO users (id, first_name, last_name, username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       username = EXCLUDED.username`,
    [user.id, user.first_name ?? null, user.last_name ?? null, user.username ?? null],
  );
  await ensureDefaultCategories(user.id);
}

export async function ensureDefaultCategories(userId) {
  const existing = await query(`SELECT 1 FROM categories WHERE user_id = $1 LIMIT 1`, [userId]);
  if (existing.rowCount > 0) return;

  const values = [];
  const params = [];
  DEFAULT_CATEGORIES.forEach((category, index) => {
    const offset = index * 5;
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, true, $${offset + 5})`);
    params.push(userId, category.key, category.label, category.color, index);
  });

  await query(
    `INSERT INTO categories (user_id, key, label, color, is_default, sort_order)
     VALUES ${values.join(", ")}
     ON CONFLICT (user_id, key) DO NOTHING`,
    params,
  );
}
