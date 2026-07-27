const TEN_MINUTES = 10 * 60 * 1000;

const states = new Map();

export function setUserState(userId, state, payload = {}) {
  clearUserState(userId);
  const timeout = setTimeout(() => clearUserState(userId), TEN_MINUTES);
  states.set(String(userId), { state, payload, timeout });
}

export function getUserState(userId) {
  return states.get(String(userId)) ?? { state: "idle", payload: null };
}

export function clearUserState(userId) {
  const current = states.get(String(userId));
  if (current?.timeout) clearTimeout(current.timeout);
  states.delete(String(userId));
}
