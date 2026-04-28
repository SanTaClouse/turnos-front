"use client";

type IconName =
  | "check" | "back" | "forward" | "close" | "calendar" | "clock"
  | "user" | "scissors" | "sparkle" | "whatsapp" | "mapPin"
  | "chevronDown" | "chevronRight" | "sun" | "moon" | "plus" | "send"
  | "edit" | "bell" | "shield" | "lock" | "phone" | "copy" | "search"
  | "trash" | "drag" | "eye" | "eyeOff" | "filter" | "link" | "store"
  | "users" | "alert" | "image" | "arrowUp" | "star" | "menu" | "settings";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2, className }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  const paths: Record<IconName, React.ReactNode> = {
    check: <path d="M4 12l5 5L20 6" />,
    back: <path d="M15 6l-6 6 6 6" />,
    forward: <path d="M9 6l6 6-6 6" />,
    close: <g><path d="M18 6L6 18" /><path d="M6 6l12 12" /></g>,
    calendar: <g><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></g>,
    clock: <g><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
    user: <g><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" /></g>,
    scissors: <g><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.5 15.5M20 20L8.5 8.5" /></g>,
    sparkle: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 13l1 2.5L22 17l-2 .5L19 20l-1-2.5L16 17l2-1.5L19 13z" />,
    whatsapp: <g><path d="M21 11.5a8.5 8.5 0 01-13 7.2L3 21l2.4-4.8A8.5 8.5 0 1121 11.5z" /></g>,
    mapPin: <g><path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" /><circle cx="12" cy="9" r="3" /></g>,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    chevronRight: <path d="M9 6l6 6-6 6" />,
    sun: <g><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></g>,
    moon: <path d="M20 15a8 8 0 01-11-11 8 8 0 1011 11z" />,
    plus: <g><path d="M12 5v14M5 12h14" /></g>,
    send: <g><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></g>,
    edit: <g><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></g>,
    bell: <g><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></g>,
    shield: <g><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></g>,
    lock: <g><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></g>,
    phone: <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.7.6 2.5a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.3-1.3a2 2 0 012-.5c.8.3 1.7.5 2.5.6a2 2 0 011.7 2z" />,
    copy: <g><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></g>,
    search: <g><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></g>,
    trash: <g><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></g>,
    drag: <g><circle cx="9" cy="6" r="1.3" /><circle cx="9" cy="12" r="1.3" /><circle cx="9" cy="18" r="1.3" /><circle cx="15" cy="6" r="1.3" /><circle cx="15" cy="12" r="1.3" /><circle cx="15" cy="18" r="1.3" /></g>,
    eye: <g><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></g>,
    eyeOff: <g><path d="M17.94 17.94A10.5 10.5 0 0112 20C5 20 1 12 1 12a19.7 19.7 0 015-5.9M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 8 11 8a19.5 19.5 0 01-2.06 3.17M14.1 14.1a3 3 0 11-4.2-4.2M1 1l22 22" /></g>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5z" />,
    link: <g><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></g>,
    store: <g><path d="M3 9l2-5h14l2 5M3 9v11h18V9M3 9h18M9 14h6" /></g>,
    users: <g><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></g>,
    alert: <g><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></g>,
    image: <g><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></g>,
    arrowUp: <g><path d="M12 19V5M5 12l7-7 7 7" /></g>,
    star: <path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l6.9-1L12 2z" />,
    menu: <g><path d="M3 12h18M3 6h18M3 18h18" /></g>,
    settings: <g><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></g>,
  };

  return <svg {...props}>{paths[name]}</svg>;
}
