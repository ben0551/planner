export interface Theme {
  name: string;
  label: string;
  emoji: string;
  gradient: string;       // CSS linear-gradient for nav sidebar / header
  primary: string;        // OKLCH value for --primary
  primaryFg: string;      // foreground on primary
}

export const THEMES: Theme[] = [
  {
    name: "violet",
    label: "Violet",
    emoji: "🟣",
    gradient: "linear-gradient(175deg, #7c3aed 0%, #4f46e5 100%)",
    primary: "oklch(0.56 0.24 280)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "sky",
    label: "Sky Blue",
    emoji: "🔵",
    gradient: "linear-gradient(175deg, #0284c7 0%, #0369a1 100%)",
    primary: "oklch(0.55 0.20 220)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "rose",
    label: "Rose",
    emoji: "🌸",
    gradient: "linear-gradient(175deg, #e11d48 0%, #be123c 100%)",
    primary: "oklch(0.55 0.25 10)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "emerald",
    label: "Emerald",
    emoji: "🌿",
    gradient: "linear-gradient(175deg, #059669 0%, #047857 100%)",
    primary: "oklch(0.55 0.18 160)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "amber",
    label: "Sunshine",
    emoji: "🌻",
    gradient: "linear-gradient(175deg, #d97706 0%, #b45309 100%)",
    primary: "oklch(0.65 0.20 80)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "pink",
    label: "Pink",
    emoji: "💗",
    gradient: "linear-gradient(175deg, #db2777 0%, #9d174d 100%)",
    primary: "oklch(0.55 0.25 340)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "ocean",
    label: "Ocean",
    emoji: "🌊",
    gradient: "linear-gradient(175deg, #0891b2 0%, #0e7490 100%)",
    primary: "oklch(0.55 0.18 200)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "midnight",
    label: "Midnight",
    emoji: "🌙",
    gradient: "linear-gradient(175deg, #1e1b4b 0%, #312e81 100%)",
    primary: "oklch(0.30 0.18 280)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "space",
    label: "Space",
    emoji: "🚀",
    gradient: "linear-gradient(175deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    primary: "oklch(0.55 0.22 270)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "dino",
    label: "Dino",
    emoji: "🦕",
    gradient: "linear-gradient(175deg, #16a34a 0%, #4ade80 100%)",
    primary: "oklch(0.60 0.22 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "gaming",
    label: "Gaming",
    emoji: "🎮",
    gradient: "linear-gradient(175deg, #14532d 0%, #166534 100%)",
    primary: "oklch(0.55 0.20 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "candy",
    label: "Candy",
    emoji: "🍭",
    gradient: "linear-gradient(175deg, #db2777 0%, #7c3aed 100%)",
    primary: "oklch(0.55 0.26 330)",
    primaryFg: "oklch(1 0 0)",
  },
];

export const DEFAULT_THEME = THEMES[0];

export function getTheme(name: string | undefined): Theme {
  return THEMES.find((t) => t.name === name) ?? DEFAULT_THEME;
}

export function applyTheme(name: string | undefined) {
  const theme = getTheme(name);
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", theme.primaryFg);
  root.style.setProperty("--ring", theme.primary);
  root.dataset.theme = theme.name;
}
