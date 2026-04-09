export function ShieldLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="7" fill="#0B1739" />
      <path
        d="M16 4L6 8.5V15.5C6 21.2 10.4 26.6 16 28C21.6 26.6 26 21.2 26 15.5V8.5L16 4Z"
        fill="#1A0A2E"
        stroke="#CB3CFF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 6.8L8 10.6V16C8 20.6 11.6 24.9 16 26.1C20.4 24.9 24 20.6 24 16V10.6L16 6.8Z"
        fill="#CB3CFF"
        fillOpacity="0.2"
      />
      <rect x="12" y="16" width="8" height="6" rx="1.5" fill="#CB3CFF" />
      <path
        d="M13.5 16V13.5C13.5 11.567 18.5 11.567 18.5 13.5V16"
        stroke="#9A91FB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="19" r="1.2" fill="#0B1739" />
    </svg>
  );
}
