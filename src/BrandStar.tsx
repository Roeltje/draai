/** A fixed vector mark: never substituted with an emoji by mobile browsers. */
export function BrandStar({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <path
        d="M50 5v90M5 50h90M18.18 18.18l63.64 63.64M18.18 81.82l63.64-63.64"
        stroke="currentColor"
        strokeWidth="12"
      />
    </svg>
  );
}
