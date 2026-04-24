interface IconProps {
  size?: number;
}

export function PlayIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15a.75.75 0 0 0 1.14.64l12.5-7.5a.75.75 0 0 0 0-1.28l-12.5-7.5A.75.75 0 0 0 7 4.5z" />
    </svg>
  );
}

export function PauseIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}

export function PrevIcon({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="2" height="14" rx="1" />
      <path d="M20 5.6v12.8a.6.6 0 0 1-.93.5L9.5 12.5a.6.6 0 0 1 0-1L19.07 5.1a.6.6 0 0 1 .93.5z" />
    </svg>
  );
}

export function NextIcon({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="17" y="5" width="2" height="14" rx="1" />
      <path d="M4 5.6v12.8a.6.6 0 0 0 .93.5l9.57-6.4a.6.6 0 0 0 0-1L4.93 5.1A.6.6 0 0 0 4 5.6z" />
    </svg>
  );
}

export function Back10Icon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4V1L7.5 5 12 9V6a6 6 0 1 1-6 6" />
      <text x="12" y="17.4" fontSize="6.2" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="'Crimson Text', serif">10</text>
    </svg>
  );
}

export function Fwd10Icon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4V1l4.5 4L12 9V6a6 6 0 1 0 6 6" />
      <text x="12" y="17.4" fontSize="6.2" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="'Crimson Text', serif">10</text>
    </svg>
  );
}

export function ChevronDownIcon({ size = 12 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M6 9l6 6 6-6H6z" />
    </svg>
  );
}

export function PlayingBars({ size = 12 }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <rect x="1" y="3" width="2" height="6" fill="currentColor">
        <animate attributeName="height" values="2;8;2" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="5;2;5" dur="0.8s" repeatCount="indefinite" />
      </rect>
      <rect x="5" y="2" width="2" height="8" fill="currentColor">
        <animate attributeName="height" values="8;3;8" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="2;4.5;2" dur="0.8s" repeatCount="indefinite" />
      </rect>
      <rect x="9" y="4" width="2" height="4" fill="currentColor">
        <animate attributeName="height" values="4;7;4" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="4;2.5;4" dur="0.8s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}
