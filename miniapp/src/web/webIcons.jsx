const svg = (children, size = 20) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const TelegramGlyph = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.1 13 1.2 11.5c-1.1-.3-1.1-1.1.2-1.6L20.5 2.6c.9-.3 1.7.2 1.4 1.7z" />
  </svg>
);

export const EyeGlyph = () =>
  svg(
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    18,
  );

export const EyeOffGlyph = () =>
  svg(
    <>
      <path d="M4 4l16 16M10.6 6A9.8 9.8 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3 3.7M6.6 7.6C4 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>,
    18,
  );

export const BoltGlyph = () => svg(<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />, 22);
export const PieGlyph = () =>
  svg(
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z" />
      <path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z" />
    </>,
    22,
  );
export const SparkGlyph = () =>
  svg(
    <path d="M12 3.5c.4 2.8 1 4.4 2.3 5.7 1.3 1.3 2.9 1.9 5.7 2.3-2.8.4-4.4 1-5.7 2.3-1.3 1.3-1.9 2.9-2.3 5.7-.4-2.8-1-4.4-2.3-5.7-1.3-1.3-2.9-1.9-5.7-2.3 2.8-.4 4.4-1 5.7-2.3 1.3-1.3 1.9-2.9 2.3-5.7z" />,
    22,
  );
export const CoinGlyph = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.3c-.4-.8-1.4-1.3-2.5-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1 1.9-2.5 1.9-1.1 0-2.1-.5-2.5-1.3M12 6.5V8M12 16v1.5" />
    </>,
    22,
  );
export const ShareGlyph = () =>
  svg(
    <>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
    </>,
    18,
  );
export const PhoneGlyph = () => svg(<><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>, 18);
