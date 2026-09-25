const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  armory: "M3 10h13l2-2h3v4h-3l-1 1v2h-3l-1 5H9l1-5H3z",
  ammo: "M7 21V9l2-5 2 5v12zM13 21V9l2-5 2 5v12z",
  range: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2z",
  stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  documents: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8",
  settings: "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  controls: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  search: "M10 3a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM21 21l-6-6",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  print: "M6 9V3h12v6M6 17H3v-8h18v8h-3M6 14h12v7H6z",
  back: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
  check: "M4 12l5 5L20 6",
  warning: "M12 3l10 18H2zM12 10v5M12 18v.5",
  info: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 11v6M12 7.5v.5",
  clock: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2",
  timer: "M9 2h6M12 5a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 9v4",
  checklist: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  course: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  target: "M12 2v4M12 18v4M2 12h4M18 12h4M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12z",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  upload: "M12 21V9M7 14l5-5 5 5M4 3h16",
  backup: "M4 7c0-2 16-2 16 0v10c0 2-16 2-16 0zM4 7c0 2 16 2 16 0M4 12c0 2 16 2 16 0",
  help: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17v.5",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  wrench: "M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 1-2-2z",
  refresh: "M20 11a8 8 0 1 0-2 5.3M20 4v7h-7",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 16, className = "", title }: { name: IconName; size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={`inline-block shrink-0 ${className}`}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
