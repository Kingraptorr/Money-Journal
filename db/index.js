import "dotenv/config";
import pg from "pg";

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
}
