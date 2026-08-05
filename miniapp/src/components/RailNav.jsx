import { Avatar } from "./Avatar.jsx";

export function RailNav({ items, avatarPhotoUrl, avatarName }) {
  return (
    <div className="sticky top-0 flex h-screen w-24 shrink-0 flex-col items-center py-6">
      <div
        className="mb-6 flex h-[42px] w-[42px] items-center justify-center rounded-2xl text-[17px] font-extrabold text-white"
        style={{
          background: "var(--tg-theme-button-color)",
          boxShadow: "0 8px 18px -8px var(--tg-theme-button-color)",
        }}
      >
        م
      </div>

      <div
        className="glass-card flex flex-col gap-2.5 rounded-[22px] p-2"
        style={{
          background: "var(--tg-theme-secondary-bg-color)",
          border: "1px solid var(--app-glass-border)",
          boxShadow: "var(--app-shadow)",
        }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={item.onClick}
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition"
            style={{ background: item.activeBg, color: item.activeColor }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <Avatar photoUrl={avatarPhotoUrl} name={avatarName} size={44} />
    </div>
  );
}
