import WebApp from "@twa-dev/sdk";

export function getTelegramUser() {
  const user = WebApp.initDataUnsafe?.user || window.Telegram?.WebApp?.initDataUnsafe?.user || null;
  if (!user) return null;

  return {
    firstName: user.first_name ?? "",
    lastName: user.last_name ?? "",
    username: user.username ?? "",
    photoUrl: user.photo_url ?? null,
  };
}

export function displayName(user) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
}
