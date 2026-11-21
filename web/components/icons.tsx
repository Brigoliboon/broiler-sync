import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20c0-8 5-14 16-16 0 11-6 16-14 16-1 0-2 0-2 0Z" />
      <path d="M6 18c3-5 7-8 12-10" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 11a8 8 0 1 0-2 6" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

export function ThermometerIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0Z" />
      <path d="M12 10v7" />
    </svg>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" />
    </svg>
  );
}

export function WindIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8h10a3 3 0 1 0-3-3" />
      <path d="M3 12h14a3 3 0 1 1-3 3" />
      <path d="M3 16h7" />
    </svg>
  );
}

export function FanIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c0-4 1-6 3-6 2 0 3 3 1 5-1 1-2 1-4 1Z" />
      <path d="M14 12c4 0 6 1 6 3 0 2-3 3-5 1-1-1-1-2-1-4Z" />
      <path d="M11 14c-4 0-6-1-6-3 0-2 3-3 5-1 1 1 1 2 1 4Z" />
    </svg>
  );
}

export function LampIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10Z" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function BatteryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="16" height="10" rx="2" />
      <path d="M21 10v4" />
      <path d="M7 10v4m4-4v4" />
    </svg>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h12M6 21h12M8 3c0 4 4 5 4 9s-4 5-4 9M16 3c0 4-4 5-4 9s4 5 4 9" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4m8-4v4M3 10h18" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H4" />
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
