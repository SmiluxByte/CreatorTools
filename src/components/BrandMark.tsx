interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      width="42"
      height="42"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="48" height="48" rx="16" fill="currentColor" opacity="0.16" />
      <path d="M22 18H42L36 30L42 46H22L28 30L22 18Z" fill="currentColor" />
      <path d="M25 24H39M25 40H39" stroke="#0b0b0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="49" cy="15" r="5" fill="#d6d6d6" />
    </svg>
  );
}
