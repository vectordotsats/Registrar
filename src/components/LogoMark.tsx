// The Registrar brand mark. Uses currentColor, so set a text color
// (e.g. text-white) and a size (e.g. w-9 h-9) via className.
// Pass blinkDot to make the dot pulse (used on the loading screen).
export default function LogoMark({
  className = "",
  blinkDot = false,
}: {
  className?: string;
  blinkDot?: boolean;
}) {
  return (
    <svg
      viewBox="238 186 440 440"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M 258 250 L 508 250 A 122 122 0 0 1 560 470 L 342 553 L 258 553 Z M 342 334 L 478 334 A 66 66 0 0 1 500 438 L 356 498 L 342 498 Z"
      />
      <circle
        cx="600"
        cy="504"
        r="58"
        className={blinkDot ? "logo-dot-blink" : undefined}
      />
    </svg>
  );
}
