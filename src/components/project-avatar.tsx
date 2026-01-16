"use client";

// Deterministic avatar based on string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const PALETTES = [
  { bg: "#1F3A5F", accent1: "#7FA6D1", accent2: "#DCE5EF" },
  { bg: "#2F3E46", accent1: "#84A98C", accent2: "#CAD2C5" },
  { bg: "#334155", accent1: "#94A3B8", accent2: "#E2E8F0" },
  { bg: "#3A4A5A", accent1: "#8FB7B2", accent2: "#D9E7E5" },
  { bg: "#3B4252", accent1: "#7B8FA1", accent2: "#D8DEE9" },
  { bg: "#3F3D56", accent1: "#A6A9C8", accent2: "#E6E8F5" },
];

interface ProjectAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function ProjectAvatar({ name, size = 44, className = "" }: ProjectAvatarProps) {
  const hash = hashString(name);
  const palette = PALETTES[hash % PALETTES.length];
  const rotation1 = (hash % 360) - 180;
  const rotation2 = ((hash * 7) % 360) - 180;
  const scale = 1.2 + (hash % 4) * 0.1;
  
  const maskId = `mask_${hash}`;
  const filterId = `filter_${hash}`;

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="80" height="80">
        <rect width="80" height="80" rx="12" ry="12" fill="#FFFFFF" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <rect width="80" height="80" rx="12" ry="12" fill={palette.bg} />
        <path
          filter={`url(#${filterId})`}
          d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
          fill={palette.accent1}
          transform={`translate(${(hash % 8) - 4} ${(hash % 6) - 3}) rotate(${rotation1} 40 40) scale(${scale})`}
        />
        <path
          filter={`url(#${filterId})`}
          d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z"
          fill={palette.accent2}
          transform={`translate(${(hash % 6) - 3} ${(hash % 8) - 4}) rotate(${rotation2} 40 40) scale(${scale})`}
          style={{ mixBlendMode: "overlay" }}
        />
      </g>
      <defs>
        <filter id={filterId} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="7" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}
