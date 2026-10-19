export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <path
        d="M24 4a20 20 0 1 0 20 20h-9a11 11 0 1 1-3.1-13.9"
        fill="none"
        stroke="#0b2545"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path d="M27 17.5h12.5L33 24.5H25.5L27 17.5Z" fill="#1d4e89" />
    </svg>
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="gm-wordmark" style={{ fontSize: size }}>
      GOTTS <span>MERCH</span>
    </span>
  );
}
