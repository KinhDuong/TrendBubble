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
      {/* Horizontal top bar of T with chart bars going down */}
      <rect x="2" y="3" width="3" height="6" fill="currentColor" rx="0.5" />
      <rect x="6" y="3" width="3" height="9" fill="currentColor" rx="0.5" />
      <rect x="10" y="3" width="3" height="4" fill="currentColor" rx="0.5" />
      <rect x="14" y="3" width="3" height="7" fill="currentColor" rx="0.5" />
      <rect x="18" y="3" width="3" height="5" fill="currentColor" rx="0.5" />

      {/* Vertical stem of T */}
      <rect x="9" y="8" width="5" height="13" fill="currentColor" rx="0.5" />
    </svg>
  );
}
