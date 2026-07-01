// Inline SVG icons (Heroicons outline, 24x24, 1.5 stroke) — replaces emoji so
// icons are consistent, themeable, and crisp. Size/color via className.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ShieldCheck = (p: IconProps) => (
  <Base {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9.5 12l1.75 1.75L14.5 10.5" /></Base>
);
export const Truck = (p: IconProps) => (
  <Base {...p}><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></Base>
);
export const ChatBubble = (p: IconProps) => (
  <Base {...p}><path d="M4 5h16v10H9l-4 3v-3H4z" /><path d="M8 9h8M8 12h5" /></Base>
);
export const MagnifyingGlass = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.2-3.2" /></Base>
);
export const ArrowRight = (p: IconProps) => (
  <Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>
);
export const Check = (p: IconProps) => (
  <Base {...p}><path d="M5 12.5l4 4 10-10" /></Base>
);
export const Document = (p: IconProps) => (
  <Base {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M9.5 13h6M9.5 16.5h6" /></Base>
);
export const Star = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></svg>
);
export const Banknotes = (p: IconProps) => (
  <Base {...p}><rect x="3" y="7" width="18" height="10" rx="2" /><circle cx="12" cy="12" r="2.2" /><path d="M6 10v4M18 10v4" /></Base>
);
export const Clock = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></Base>
);

// Nav / dashboard
export const Grid = (p: IconProps) => (
  <Base {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></Base>
);
export const Inbox = (p: IconProps) => (
  <Base {...p}><path d="M4 13l2-8h12l2 8v6H4z" /><path d="M4 13h4l1 2h6l1-2h4" /></Base>
);
export const Plus = (p: IconProps) => (
  <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
);
export const Users = (p: IconProps) => (
  <Base {...p}><circle cx="9" cy="9" r="3" /><path d="M3.5 19a5.5 5.5 0 0111 0" /><path d="M16 6.5a3 3 0 010 5.8M15.5 19a5.5 5.5 0 015-3" /></Base>
);
export const ChartBar = (p: IconProps) => (
  <Base {...p}><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7" y="12" width="3" height="5" /><rect x="12" y="8" width="3" height="9" /><rect x="17" y="14" width="3" height="3" /></Base>
);
export const Cog = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M4.2 7l2.1 1.2M17.7 15.8l2.1 1.2M20 7l-2.1 1.2M6.3 15.8L4.2 17M3 12h2.5M18.5 12H21" /></Base>
);
export const Menu = (p: IconProps) => (
  <Base {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Base>
);
export const Logout = (p: IconProps) => (
  <Base {...p}><path d="M15 4h4v16h-4" /><path d="M10 12h9M15 8l4 4-4 4" /></Base>
);
export const AlertTriangle = (p: IconProps) => (
  <Base {...p}><path d="M12 4l9 15H3z" /><path d="M12 10v4M12 17h.01" /></Base>
);
export const Sun = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></Base>
);
export const ChevronDown = (p: IconProps) => (
  <Base {...p}><path d="M6 9l6 6 6-6" /></Base>
);
export const Bolt = (p: IconProps) => (
  <Base {...p}><path d="M13 3L5 13h6l-2 8 8-10h-6z" /></Base>
);
export const PackageCheck = (p: IconProps) => (
  <Base {...p}><path d="M12 3l8 4-8 4-8-4 8-4z" /><path d="M4 7v9l8 4 8-4V7" /><path d="M9.5 13l1.75 1.75L15 11" /></Base>
);
