import { ChevronIcon, MoonIcon, SunIcon, TagIcon } from "../components/Icons.jsx";
import { ScreenHeader } from "../components/ScreenHeader.jsx";

export function Settings({ theme, onToggleTheme, onOpenCategories, isWide, avatarPhotoUrl, avatarName }) {
  const dark = theme === "dark";

  return (
    <div className="fade-in flex flex-col gap-4">
      <ScreenHeader
        subtitle="حساب و ترجیحات"
        title="تنظیمات"
        isWide={isWide}
        avatarPhotoUrl={avatarPhotoUrl}
        avatarName={avatarName}
      />

      <div
        className="glass-card overflow-hidden rounded-[20px]"
        style={{
          background: "var(--tg-theme-secondary-bg-color)",
          border: "1px solid var(--app-glass-border)",
          boxShadow: "var(--app-shadow)",
        }}
      >
        <div
          className="flex items-center gap-3 border-b p-4"
          style={{ borderColor: "var(--app-divider-color)" }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--app-theme-icon-bg)", color: "var(--app-theme-icon-color)" }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </span>
          <span className="flex-1 text-[14.5px] font-semibold text-tg-text">حالت تاریک</span>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="تغییر حالت تاریک"
            className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
            style={{ background: dark ? "var(--tg-theme-button-color)" : "rgba(0,0,0,.15)" }}
          >
            <span
              className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all"
              style={{ boxShadow: "0 2px 6px rgba(0,0,0,.2)", right: dark ? "23px" : "3px" }}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCategories}
          className="flex w-full items-center gap-3 p-4 text-inherit"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--tg-theme-button-color) 13%, transparent)", color: "var(--tg-theme-button-color)" }}
          >
            <TagIcon />
          </span>
          <span className="flex-1 text-right text-[14.5px] font-semibold text-tg-text">ویرایش دسته‌بندی‌ها</span>
          <span className="flex -scale-x-100 text-tg-hint">
            <ChevronIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
