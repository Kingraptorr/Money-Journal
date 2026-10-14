import { authHeaders } from "../utils/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function call(method, path, { body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
        ...(await authHeaders()),
        ...headers,
      },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    return { ok: false, status: 0, error: "network_error", data: null };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // no JSON body
  }
  return {
    ok: response.ok,
    status: response.status,
    data,
    error: response.ok ? null : (data?.error ?? "api_error"),
    retryAfter: data?.retryAfter,
    attemptsLeft: data?.attemptsLeft,
  };
}

export const authApi = {
  me: () => call("GET", "/api/auth/me"),
  refresh: () => call("POST", "/api/auth/refresh"),
  signup: (email, password, displayName) => call("POST", "/api/auth/email/signup", { body: { email, password, displayName } }),
  login: (email, password) => call("POST", "/api/auth/email/login", { body: { email, password } }),
  logout: () => call("POST", "/api/auth/logout"),
  logoutAll: () => call("POST", "/api/auth/logout-all"),
  telegramRequest: () => call("POST", "/api/auth/telegram/request"),
  telegramPoll: (requestId, pollSecret) =>
    call("GET", `/api/auth/telegram/poll?requestId=${encodeURIComponent(requestId)}`, { headers: { "X-Poll-Secret": pollSecret } }),
  codeChallenge: () => call("POST", "/api/auth/code/challenge"),
  codeLogin: (challengeId, code) => call("POST", "/api/auth/code", { body: { challengeId, code } }),
  linkTelegram: () => call("POST", "/api/auth/link/telegram"),
  linkEmail: (email, password) => call("POST", "/api/auth/link/email", { body: { email, password } }),
  changePassword: (currentPassword, newPassword) => call("POST", "/api/auth/password", { body: { currentPassword, newPassword } }),
};

export async function loadSession() {
  let result = await authApi.me();
  if (result.status === 401) {
    const refreshed = await authApi.refresh();
    if (refreshed.ok) result = await authApi.me();
  }
  return result.ok ? result.data.account : null;
}
