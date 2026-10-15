// Ported from FE/icons.jsx — same stroke icon set, now a proper ES module
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
  calendar:  <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  bed:       <><path d="M2 18V8M22 18v-6a3 3 0 0 0-3-3H2M2 14h20" /><circle cx="6" cy="12" r="2" /></>,
  key:       <><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l3 3M14 9l3 3" /></>,
  sparkle:   <><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l3 3M15.5 15.5l3 3M5.5 18.5l3-3M15.5 8.5l3-3" /></>,
  wrench:    <><path d="M14 7a4 4 0 1 0-3 6.83l-7.5 7.5 1.42 1.42L12.5 15l1.5 1.5a4 4 0 0 0 5-5L17 9l-2 2-2-2 2-2z" /></>,
  receipt:   <><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  users:     <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M14.5 14.5c2.5 0 6 1.5 6 5" /></>,
  user:      <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  chart:     <><path d="M4 20V10M10 20V4M16 20v-6M22 20H2" /></>,
  settings:  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  bell:      <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" /></>,
  search:    <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  plus:      <path d="M12 5v14M5 12h14" />,
  arrow_right: <path d="M5 12h14M13 5l7 7-7 7" />,
  arrow_left:  <path d="M19 12H5M11 5l-7 7 7 7" />,
  arrow_up:    <path d="M7 14l5-5 5 5" />,
  arrow_down:  <path d="M7 10l5 5 5-5" />,
  check:     <path d="M5 12l5 5L20 7" />,
  x:         <path d="M6 6l12 12M18 6L6 18" />,
  more:      <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  filter:    <path d="M3 5h18l-7 9v6l-4-2v-4z" />,
  download:  <path d="M12 3v13M6 12l6 6 6-6M4 21h16" />,
  print:     <><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" /><rect x="6" y="14" width="12" height="8" /></>,
  mail:      <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 7l9 7 9-7" /></>,
  phone:     <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  map:       <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  clock:     <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  star:      <path d="M12 3l2.6 6.3 6.7.5-5.1 4.4 1.6 6.5L12 17.3 6.2 20.7l1.6-6.5L2.7 9.8l6.7-.5z" />,
  logout:    <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" />,
  lock:      <><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  eye:       <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  crown:     <path d="M3 17l1-9 4 5 4-7 4 7 4-5 1 9z M3 17h18v3H3z" />,
  pencil:    <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />,
  trash:     <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
  alert:     <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.7L2 19a1 1 0 0 0 .9 1.3h18.2a1 1 0 0 0 .9-1.3L13.7 3.7a2 2 0 0 0-3.4 0z" /></>,
  refresh:   <path d="M1 4v6h6M23 20v-6h-6M20.5 8.5A9 9 0 0 0 5.6 5.4L1 10M23 14l-4.6 4.6A9 9 0 0 1 3.5 15.5" />,
  coffee:    <><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" /></>,
  leaf:      <path d="M17 8C8 10 5.9 16.17 3 22c1.04 0 5.99-1.18 10-4 1.44-1.04 2.49-2.53 3-4 .64-1.87.39-3.75 0-5M20 2C17 3 9 7 10 17" />,
  wifi:      <><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></>,
  spa:       <><path d="M12 22c-4 0-7-3-7-7 0-2.5 1-5 3-7 1 2 1 4 0 6 2-1 4-3 4-6 2 2 3 4 3 6a7 7 0 0 1-3 5.83" /><path d="M12 22V12" /></>,
  pool:      <><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><circle cx="12" cy="6" r="2" /><path d="M12 8v2" /></>,
  edit:      <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />,
  menu:      <path d="M3 6h18M3 12h18M3 18h18" />,
};

export default function Icon({ name, size = 16, className = '', style = {} }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {PATHS[name] || null}
    </svg>
  );
}
