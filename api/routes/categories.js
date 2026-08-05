import { Router } from "express";
import { ensureDefaultCategories, query } from "../../db/index.js";

export const categoriesRouter = Router();

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const GENERIC_ICON_KEYS = new Set([
  "star",
  "bookmark",
  "flag",
  "briefcase",
  "paw",
  "music",
  "camera",
  "umbrella",
  "trophy",
  "leaf",
  "wrench",
  "dumbbell",
  "phone",
  "cup",
  "anchor",
  "target",
]);

function slugify(label) {
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

async function matchesDefaultLabel(userId, label, excludeKey = null) {
  const result = await query(
    `SELECT 1 FROM categories
     WHERE user_id = $1 AND is_default = true AND LOWER(TRIM(label)) = LOWER(TRIM($2)) AND key IS DISTINCT FROM $3
     LIMIT 1`,
    [userId, label, excludeKey],
  );
  return result.rowCount > 0;
}

categoriesRouter.get("/", async (req, res, next) => {
  try {
    await ensureDefaultCategories(req.user.id);
    const result = await query(
      `SELECT key, label, color, icon, is_default
       FROM categories
       WHERE user_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [req.user.id],
    );
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/", async (req, res, next) => {
  try {
    const label = String(req.body.label ?? "").trim();
    const color = String(req.body.color ?? "").trim();
    const icon = GENERIC_ICON_KEYS.has(req.body.icon) ? req.body.icon : "star";

    if (!label) {
      res.status(400).json({ error: "invalid_label" });
      return;
    }
    if (!HEX_COLOR_PATTERN.test(color)) {
      res.status(400).json({ error: "invalid_color" });
      return;
    }

    await ensureDefaultCategories(req.user.id);

    if (await matchesDefaultLabel(req.user.id, label)) {
      res.status(409).json({ error: "label_matches_default" });
      return;
    }

    const base = slugify(label) || "category";
    let key = `custom_${base}`;
    let suffix = 1;
    while (suffix < 100) {
      const existing = await query(`SELECT 1 FROM categories WHERE user_id = $1 AND key = $2`, [req.user.id, key]);
      if (existing.rowCount === 0) break;
      suffix += 1;
      key = `custom_${base}_${suffix}`;
    }

    const maxOrder = await query(`SELECT COALESCE(MAX(sort_order), -1) AS max FROM categories WHERE user_id = $1`, [
      req.user.id,
    ]);

    const result = await query(
      `INSERT INTO categories (user_id, key, label, color, icon, is_default, sort_order)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING key, label, color, icon, is_default`,
      [req.user.id, key, label, color, icon, Number(maxOrder.rows[0].max) + 1],
    );

    res.status(201).json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.patch("/:key", async (req, res, next) => {
  try {
    const label = String(req.body.label ?? "").trim();
    const color = String(req.body.color ?? "").trim();

    if (!label) {
      res.status(400).json({ error: "invalid_label" });
      return;
    }
    if (!HEX_COLOR_PATTERN.test(color)) {
      res.status(400).json({ error: "invalid_color" });
      return;
    }

    const existing = await query(`SELECT is_default, icon FROM categories WHERE user_id = $1 AND key = $2`, [
      req.user.id,
      req.params.key,
    ]);

    if (existing.rowCount === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    if (await matchesDefaultLabel(req.user.id, label, req.params.key)) {
      res.status(409).json({ error: "label_matches_default" });
      return;
    }

    // Default categories keep their built-in icon; only custom categories can change it.
    const icon = existing.rows[0].is_default
      ? existing.rows[0].icon
      : GENERIC_ICON_KEYS.has(req.body.icon)
        ? req.body.icon
        : (existing.rows[0].icon ?? "star");

    const result = await query(
      `UPDATE categories
       SET label = $1, color = $2, icon = $3
       WHERE user_id = $4 AND key = $5
       RETURNING key, label, color, icon, is_default`,
      [label, color, icon, req.user.id, req.params.key],
    );

    res.json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.delete("/:key", async (req, res, next) => {
  try {
    const existing = await query(`SELECT is_default FROM categories WHERE user_id = $1 AND key = $2`, [
      req.user.id,
      req.params.key,
    ]);

    if (existing.rowCount === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (existing.rows[0].is_default) {
      res.status(400).json({ error: "cannot_delete_default" });
      return;
    }

    await query(`DELETE FROM categories WHERE user_id = $1 AND key = $2`, [req.user.id, req.params.key]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
