import { Avatar } from "./Avatar.jsx";

export function ScreenHeader({ subtitle, title, isWide, avatarPhotoUrl, avatarName, action }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="mb-0.5 text-sm font-medium text-tg-hint">{subtitle}</div>
        <div className="text-[22px] font-extrabold text-tg-text">{title}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {!isWide ? <Avatar photoUrl={avatarPhotoUrl} name={avatarName} size={42} /> : null}
      </div>
    </div>
  );
}
