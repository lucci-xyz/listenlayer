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
  { bg: "#ff005b", accent1: "#ff7d10", accent2: "#ffb238" },
  { bg: "#49007e", accent1: "#ff005b", accent2: "#ff7d10" },
  { bg: "#ff7d10", accent1: "#ffb238", accent2: "#0a0310" },
  { bg: "#0ea5e9", accent1: "#06b6d4", accent2: "#22d3ee" },
  { bg: "#8b5cf6", accent1: "#a78bfa", accent2: "#c4b5fd" },
  { bg: "#10b981", accent1: "#34d399", accent2: "#6ee7b7" },
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
