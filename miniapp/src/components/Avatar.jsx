export function Avatar({ photoUrl, name, size = 42 }) {
  const initial = (name || "").trim().charAt(0) || "؟";

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || "کاربر"}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, background: "var(--app-subtle-bg)", color: "var(--tg-theme-hint-color)" }}
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
    >
      {initial}
    </span>
  );
}
