interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Clean horizontal top bar */}
      <rect x="3" y="4" width="18" height="2.5" fill="currentColor" rx="1.25" />

      {/* Simple chart bars hanging down */}
      <rect x="5" y="6.5" width="2" height="3" fill="currentColor" rx="1" />
      <rect x="9" y="6.5" width="2" height="5" fill="currentColor" rx="1" />
      <rect x="13" y="6.5" width="2" height="4" fill="currentColor" rx="1" />
      <rect x="17" y="6.5" width="2" height="2.5" fill="currentColor" rx="1" />

      {/* Central stem */}
      <rect x="10.5" y="6.5" width="3" height="13.5" fill="currentColor" rx="1.5" />
    </svg>
  );
}
