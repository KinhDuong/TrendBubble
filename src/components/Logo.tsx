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
      {/* Horizontal top bar of T with rounded ends */}
      <rect x="2" y="3" width="20" height="3" fill="currentColor" rx="1.5" />

      {/* Chart bars hanging down from the top bar (inverted bar chart) */}
      <rect x="3" y="6" width="2.5" height="4" fill="currentColor" rx="1.25" />
      <rect x="7" y="6" width="2.5" height="6" fill="currentColor" rx="1.25" />
      <rect x="14.5" y="6" width="2.5" height="5" fill="currentColor" rx="1.25" />
      <rect x="18.5" y="6" width="2.5" height="3" fill="currentColor" rx="1.25" />

      {/* Vertical stem of T (center) */}
      <rect x="10" y="6" width="4" height="15" fill="currentColor" rx="2" />
    </svg>
  );
}
