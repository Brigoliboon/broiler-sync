import { useId } from "react";

type HouseSceneProps = {
  /** Crop of the 480x420 scene. The phone layout shows only the house. */
  viewBox?: string;
  width: number;
  height: number;
  /** Control lamp glow: 0.45 at idle, 0.8 once readings update. */
  glowOpacity: number;
  className?: string;
};

/** Broiler house cutaway from the landing-v2 mockup (sample scene). */
export function HouseScene({
  viewBox = "0 0 480 420",
  width,
  height,
  glowOpacity,
  className = "scene",
}: HouseSceneProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glowId = `${id}-glow`;
  const clipId = `${id}-inside`;
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="#FB923C" stopOpacity="1" />
          <stop offset=".45" stopColor="#FDBA74" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFEDD5" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <rect x="36" y="176" width="408" height="164" />
        </clipPath>
      </defs>
      <rect width="480" height="420" fill="#EFF6FF" />
      <rect y="340" width="480" height="80" fill="#DCFCE7" />
      <rect y="340" width="480" height="3" fill="#BBF7D0" />
      <rect x="24" y="176" width="432" height="164" fill="#CBD5E1" />
      <rect x="36" y="176" width="408" height="164" fill="#F8FAFC" />
      <g clipPath={`url(#${clipId})`}>
        <g className="glow" style={{ opacity: glowOpacity }}>
          <circle cx="370" cy="230" r="70" fill={`url(#${glowId})`} />
        </g>
      </g>
      <rect x="36" y="318" width="408" height="22" fill="#FFEDD5" />
      <rect x="236" y="176" width="8" height="164" fill="#CBD5E1" />
      <polygon points="8,180 240,108 472,180" fill="#334155" />
      <rect x="8" y="176" width="464" height="8" rx="2" fill="#1E293B" />
      <svg x="48" y="192" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
        <path d="M8.5 2h7" />
        <path d="M7 16h10" />
      </svg>
      <text x="70" y="205" fontSize="13" fontWeight="600" fill="#334155">Experimental</text>
      <svg x="256" y="192" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
      <text x="278" y="205" fontSize="13" fontWeight="600" fill="#334155">Control</text>
      <circle cx="64" cy="250" r="24" fill="#fff" stroke="#94A3B8" strokeWidth="2" />
      <path d="M64 218 a32 32 0 0 1 30 18" fill="none" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <path d="M64 282 a32 32 0 0 1 -30 -18" fill="none" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <g transform="translate(64,250)">
        <g className="spin">
          <ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="#0369A1" transform="rotate(0)" />
          <ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="#0369A1" transform="rotate(120)" />
          <ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="#0369A1" transform="rotate(240)" />
        </g>
        <circle r="3.5" fill="#fff" stroke="#0369A1" strokeWidth="2" />
      </g>
      <path d="M98 242h22M98 252h30M98 262h18" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 5" className="airflow" />
      <circle cx="416" cy="250" r="24" fill="#fff" stroke="#94A3B8" strokeWidth="2" />
      <g transform="translate(416,250)">
        <g>
        <ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="#94A3B8" transform="rotate(0)" />
        <ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="#94A3B8" transform="rotate(120)" />
        <ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="#94A3B8" transform="rotate(240)" />
      </g>
      <circle r="3.5" fill="#fff" stroke="#94A3B8" strokeWidth="2" />
    </g>
    <line x1="196" y1="184" x2="196" y2="208" stroke="#64748B" strokeWidth="2" />
    <polygon points="185,208 207,208 213,220 179,220" fill="#475569" />
    <circle cx="196" cy="224" r="5" fill="#E2E8F0" stroke="#94A3B8" />
    <line x1="370" y1="184" x2="370" y2="208" stroke="#64748B" strokeWidth="2" />
    <polygon points="359,208 381,208 387,220 353,220" fill="#475569" />
    <circle cx="370" cy="224" r="6" fill="#FB923C" />
    <circle cx="240" cy="228" r="22" fill="none" stroke="#1D4ED8" strokeWidth="2" opacity=".35" />
    <circle cx="240" cy="228" r="34" fill="none" stroke="#1D4ED8" strokeWidth="1.5" opacity=".15" />
    <rect x="221" y="216" width="38" height="26" rx="5" fill="#0F172A" />
    <rect x="229" y="222" width="12" height="12" rx="2" fill="#334155" />
    <circle cx="251" cy="223" r="2.5" fill="#22C55E" className="led" />
    <g className="wifi">
      <svg x="230" y="190" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h.01" />
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.859a10 10 0 0 1 14 0" />
        <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      </svg>
    </g>
    <g>
    <svg x="78" y="296" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7h.01" />
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
      <path d="m20 7 2 .5-2 .5" />
      <path d="M10 18v3" />
      <path d="M14 17.75V21" />
      <path d="M7 18a6 6 0 0 0 3.84-10.61" />
    </svg>
  </g>
  <g transform="translate(258,0) scale(-1,1)">
    <svg x="118" y="302" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7h.01" />
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
      <path d="m20 7 2 .5-2 .5" />
      <path d="M10 18v3" />
      <path d="M14 17.75V21" />
      <path d="M7 18a6 6 0 0 0 3.84-10.61" />
    </svg>
  </g>
  <g>
  <svg x="160" y="296" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7h.01" />
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
    <path d="m20 7 2 .5-2 .5" />
    <path d="M10 18v3" />
    <path d="M14 17.75V21" />
    <path d="M7 18a6 6 0 0 0 3.84-10.61" />
  </svg>
</g>
<g transform="translate(422,0) scale(-1,1)">
  <svg x="200" y="302" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7h.01" />
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
    <path d="m20 7 2 .5-2 .5" />
    <path d="M10 18v3" />
    <path d="M14 17.75V21" />
    <path d="M7 18a6 6 0 0 0 3.84-10.61" />
  </svg>
</g>
<g>
<svg x="262" y="296" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="M16 7h.01" />
  <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
  <path d="m20 7 2 .5-2 .5" />
  <path d="M10 18v3" />
  <path d="M14 17.75V21" />
  <path d="M7 18a6 6 0 0 0 3.84-10.61" />
</svg>
</g>
<g transform="translate(626,0) scale(-1,1)">
<svg x="302" y="302" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="M16 7h.01" />
  <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
  <path d="m20 7 2 .5-2 .5" />
  <path d="M10 18v3" />
  <path d="M14 17.75V21" />
  <path d="M7 18a6 6 0 0 0 3.84-10.61" />
</svg>
</g>
<g>
<svg x="346" y="296" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
<path d="M16 7h.01" />
<path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
<path d="m20 7 2 .5-2 .5" />
<path d="M10 18v3" />
<path d="M14 17.75V21" />
<path d="M7 18a6 6 0 0 0 3.84-10.61" />
</svg>
</g>
<g transform="translate(806,0) scale(-1,1)">
<svg x="392" y="302" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
<path d="M16 7h.01" />
<path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
<path d="m20 7 2 .5-2 .5" />
<path d="M10 18v3" />
<path d="M14 17.75V21" />
<path d="M7 18a6 6 0 0 0 3.84-10.61" />
</svg>
</g>
    </svg>
  );
}
