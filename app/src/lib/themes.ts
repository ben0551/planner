export interface Theme {
  name: string;
  label: string;
  emoji: string;
  gradient: string;       // CSS background for nav sidebar / header
  primary: string;        // OKLCH value for --primary
  primaryFg: string;      // foreground on primary
}

export const THEMES: Theme[] = [
  // ── Clean / adult themes ────────────────────────────────────────
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
    name: "ocean",
    label: "Ocean",
    emoji: "🌊",
    // Subtle horizontal wave lines over teal
    gradient: "repeating-linear-gradient(180deg, transparent 0px, transparent 14px, rgba(255,255,255,0.08) 14px, rgba(255,255,255,0.08) 16px), linear-gradient(175deg, #0891b2 0%, #0e7490 100%)",
    primary: "oklch(0.55 0.18 200)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "midnight",
    label: "Midnight",
    emoji: "🌙",
    // Deep indigo with a few stars
    gradient: "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.7) 1px, transparent 2px), radial-gradient(circle at 55% 12%, rgba(255,255,255,0.5) 1px, transparent 2px), radial-gradient(circle at 85% 40%, rgba(255,255,255,0.6) 1px, transparent 2px), radial-gradient(circle at 35% 65%, rgba(255,255,255,0.4) 0.8px, transparent 2px), radial-gradient(circle at 75% 80%, rgba(255,255,255,0.5) 1px, transparent 2px), linear-gradient(175deg, #1e1b4b 0%, #312e81 100%)",
    primary: "oklch(0.30 0.18 280)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "pink",
    label: "Rainbow",
    emoji: "🌈",
    // Full spectrum gradient
    gradient: "linear-gradient(175deg, #f43f5e 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #8b5cf6 100%)",
    primary: "oklch(0.55 0.26 330)",
    primaryFg: "oklch(1 0 0)",
  },
  // ── Fun / kid themes ─────────────────────────────────────────────
  {
    name: "space",
    label: "Space",
    emoji: "🚀",
    // Deep space with twinkling stars
    gradient: "radial-gradient(circle at 10% 18%, rgba(255,255,255,0.9) 1px, transparent 2px), radial-gradient(circle at 38% 8%, rgba(255,255,255,0.6) 1px, transparent 2px), radial-gradient(circle at 68% 32%, rgba(255,255,255,0.9) 1.5px, transparent 3px), radial-gradient(circle at 22% 58%, rgba(255,255,255,0.7) 1px, transparent 2px), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.5) 1px, transparent 2px), radial-gradient(circle at 52% 83%, rgba(255,255,255,0.8) 1px, transparent 2px), radial-gradient(circle at 6% 88%, rgba(255,255,255,0.6) 0.8px, transparent 2px), radial-gradient(circle at 91% 14%, rgba(255,255,255,0.7) 1px, transparent 2px), radial-gradient(circle at 28% 88%, rgba(255,255,255,0.5) 1.3px, transparent 3px), radial-gradient(circle at 63% 48%, rgba(255,255,255,0.9) 0.8px, transparent 2px), radial-gradient(circle at 84% 43%, rgba(255,255,255,0.6) 1px, transparent 2px), radial-gradient(circle at 47% 25%, rgba(255,255,255,0.8) 1px, transparent 2px), linear-gradient(175deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    primary: "oklch(0.55 0.22 270)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "dino",
    label: "Dino",
    emoji: "🦕",
    // Reptile scale pattern on jungle green
    gradient: "repeating-linear-gradient(30deg, transparent 0px, transparent 10px, rgba(255,255,255,0.07) 10px, rgba(255,255,255,0.07) 11px), repeating-linear-gradient(-30deg, transparent 0px, transparent 10px, rgba(255,255,255,0.07) 10px, rgba(255,255,255,0.07) 11px), linear-gradient(175deg, #16a34a 0%, #14532d 100%)",
    primary: "oklch(0.60 0.22 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "gaming",
    label: "Minecraft",
    emoji: "⛏️",
    // Pixel block grid on grass green
    gradient: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 20px), linear-gradient(175deg, #4a7c3a 0%, #2d5c1e 100%)",
    primary: "oklch(0.55 0.20 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "candy",
    label: "Candy",
    emoji: "🍭",
    // Diagonal candy stripe: pink → amber → purple → amber
    gradient: "repeating-linear-gradient(45deg, #db2777 0px, #db2777 18px, #d97706 18px, #d97706 36px, #7c3aed 36px, #7c3aed 54px, #d97706 54px, #d97706 72px)",
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
