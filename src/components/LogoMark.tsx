// The Registrar brand mark. Uses currentColor, so set a text color
// (e.g. text-white) and a size (e.g. w-9 h-9) via className.
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="160 175 660 645"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M 455 195 L 800 525 L 705 788 L 560 648 L 648 590 L 470 468 L 455 360 L 320 560 L 180 800 Z M 455 290 L 566 412 L 520 420 L 455 348 L 390 420 L 344 412 Z"
      />
    </svg>
  );
}
