import WebApp from "@twa-dev/sdk";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

let sessionToken = null;

export async function authenticate() {
  if (sessionToken) return sessionToken;
  const initData = WebApp.initData || window.Telegram?.WebApp?.initData || "";

  if (!initData) {
    throw new Error("telegram_init_data_missing");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (!response.ok) throw new Error("auth_failed");
  const data = await response.json();
  sessionToken = data.token;
  return sessionToken;
}

async function api(path, options = {}) {
  const token = await authenticate();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let code = "api_error";
    try {
      const body = await response.json();
      if (body?.error) code = body.error;
    } catch {
      // response had no JSON body; keep the generic code
    }
    throw new Error(code);
  }
  return response.json();
}

export function getSummary(month, days) {
  const daysQuery = days ? `&days=${days}` : "";
  return api(`/api/expenses/summary?month=${month}${daysQuery}`, { fallback: { total: 0 } });
}

export function getChart(month) {
  return api(`/api/expenses/chart?month=${month}`, { fallback: { data: [] } });
}

export function getHistory(month, category) {
  const categoryQuery = category ? `&category=${category}` : "";
  return api(`/api/expenses/history?month=${month}${categoryQuery}`, { fallback: { expenses: [] } });
}

export function deleteExpense(id) {
  return api(`/api/expenses/${id}`, { method: "DELETE" });
}

export function updateExpense(id, expense) {
  return api(`/api/expenses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
}

export function createExpense(expense) {
  return api(`/api/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
}

export function getCategories() {
  return api(`/api/categories`, { fallback: { categories: [] } });
}

export function createCategory(category) {
  return api(`/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  });
}

export function updateCategory(key, category) {
  return api(`/api/categories/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  });
}

export function deleteCategory(key) {
  return api(`/api/categories/${key}`, { method: "DELETE" });
}

export function getReportStatus(month) {
  return api(`/api/reports/status?month=${month}`, {
    fallback: { eligible: false, reason: "unknown", eligibleAt: null },
  });
}

export function getReportHistory(month) {
  return api(`/api/reports/history?month=${month}`, { fallback: { reports: [] } });
}

export function generateReport(month, kind) {
  return api(`/api/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, kind }),
  });
}
