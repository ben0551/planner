export interface Theme {
  name: string;
  label: string;
  emoji: string;
  gradient: string;       // CSS background for nav sidebar / header
  primary: string;        // OKLCH value for --primary
  primaryFg: string;      // foreground on primary
}

// SVG data URIs for illustrated kid themes
// Single-quoted SVG attributes, # encoded as %23, < as %3C, > as %3E
const MINECRAFT_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%238B5E3C'/%3E%3Crect width='32' height='10' fill='%235DA02A'/%3E%3Crect width='32' height='3' fill='%2376C93D'/%3E%3Crect y='9' width='32' height='1' fill='%233B6B14' opacity='.5'/%3E%3Crect x='4' y='14' width='5' height='4' fill='%236B3F1E' opacity='.7'/%3E%3Crect x='19' y='21' width='4' height='4' fill='%236B3F1E' opacity='.7'/%3E%3Crect x='10' y='26' width='6' height='3' fill='%239B6B45' opacity='.4'/%3E%3C/svg%3E\") 0 0 / 32px 32px repeat";

const SPACE_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%230d0a2e'/%3E%3Ccircle cx='12' cy='18' r='1.5' fill='white' opacity='.9'/%3E%3Ccircle cx='58' cy='8' r='1' fill='white' opacity='.7'/%3E%3Ccircle cx='72' cy='42' r='2' fill='white' opacity='.6'/%3E%3Ccircle cx='32' cy='56' r='1.2' fill='white' opacity='.8'/%3E%3Ccircle cx='65' cy='68' r='1.5' fill='white' opacity='.7'/%3E%3Ccircle cx='8' cy='72' r='0.8' fill='white' opacity='.5'/%3E%3Ccircle cx='48' cy='35' r='0.9' fill='white' opacity='.9'/%3E%3Ccircle cx='20' cy='50' r='1.8' fill='white' opacity='.3'/%3E%3Ccircle cx='78' cy='22' r='1.3' fill='white' opacity='.8'/%3E%3Cpath d='M68,28 L69.5,31.5 L73,33 L69.5,34.5 L68,38 L66.5,34.5 L63,33 L66.5,31.5Z' fill='white' opacity='.8'/%3E%3Ccircle cx='35' cy='65' r='7' fill='%23ffe566'/%3E%3Ccircle cx='39' cy='62' r='6.5' fill='%230d0a2e'/%3E%3C/svg%3E\") 0 0 / 80px 80px repeat";

// Dino: jungle scene with a cute cartoon dino. Overlay darkens it so white text stays readable.
const DINO_SVG = "linear-gradient(rgba(5,40,15,0.35),rgba(5,40,15,0.35)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%2316a34a'/%3E%3Ccircle cx='170' cy='80' r='50' fill='%2315803d' opacity='.6'/%3E%3Ccircle cx='20' cy='210' r='60' fill='%2314532d' opacity='.4'/%3E%3Cellipse cx='100' cy='200' rx='48' ry='38' fill='%23166534'/%3E%3Cellipse cx='74' cy='162' rx='22' ry='32' fill='%23166534' transform='rotate(-15,74,162)'/%3E%3Cellipse cx='58' cy='132' rx='20' ry='13' fill='%23166534' transform='rotate(-20,58,132)'/%3E%3Ccircle cx='50' cy='126' r='4.5' fill='%2322c55e'/%3E%3Ccircle cx='51' cy='125' r='2' fill='%23052e16'/%3E%3Cpath d='M48,136 Q58,142 65,136' stroke='%2322c55e' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Crect x='80' y='232' width='16' height='38' rx='8' fill='%23166534'/%3E%3Crect x='106' y='235' width='16' height='35' rx='8' fill='%23166534'/%3E%3Cpath d='M148,192 Q170,174 178,148' stroke='%23166534' stroke-width='14' fill='none' stroke-linecap='round'/%3E%3Crect x='172' y='148' width='8' height='100' rx='4' fill='%23854d0e'/%3E%3Cellipse cx='176' cy='148' rx='30' ry='12' fill='%2322c55e' transform='rotate(-25,176,148)'/%3E%3Cellipse cx='176' cy='144' rx='26' ry='10' fill='%234ade80' transform='rotate(25,176,144)'/%3E%3Crect x='10' y='228' width='7' height='72' rx='3.5' fill='%23854d0e'/%3E%3Cellipse cx='13' cy='228' rx='22' ry='9' fill='%2322c55e' transform='rotate(20,13,228)'/%3E%3Cellipse cx='13' cy='224' rx='20' ry='8' fill='%234ade80' transform='rotate(-20,13,224)'/%3E%3C/svg%3E\") center / cover no-repeat";

// Candy: bright lollipops with a dark overlay so text stays readable
const CANDY_SVG = "linear-gradient(rgba(90,0,70,0.5),rgba(70,0,100,0.5)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23fce7f3'/%3E%3Ccircle cx='50' cy='75' r='38' fill='%23f9a8d4'/%3E%3Ccircle cx='50' cy='75' r='38' fill='none' stroke='%23f472b6' stroke-width='10' stroke-dasharray='20,12'/%3E%3Ccircle cx='50' cy='75' r='12' fill='%23fbbf24' opacity='.7'/%3E%3Crect x='46' y='111' width='8' height='65' rx='4' fill='white'/%3E%3Ccircle cx='155' cy='185' r='30' fill='%23c4b5fd'/%3E%3Ccircle cx='155' cy='185' r='30' fill='none' stroke='%238b5cf6' stroke-width='8' stroke-dasharray='16,10'/%3E%3Ccircle cx='155' cy='185' r='10' fill='%23fbbf24' opacity='.7'/%3E%3Crect x='151' y='213' width='7' height='55' rx='3.5' fill='white'/%3E%3Ccircle cx='165' cy='55' r='22' fill='%23fde68a'/%3E%3Ccircle cx='165' cy='55' r='22' fill='none' stroke='%23f59e0b' stroke-width='6' stroke-dasharray='12,7'/%3E%3Crect x='162' y='75' width='6' height='38' rx='3' fill='white'/%3E%3Cpath d='M28,210 Q22,185 32,162 Q38,140 30,118 Q24,102 28,88' stroke='%23fecdd3' stroke-width='20' fill='none' stroke-linecap='round'/%3E%3Cpath d='M28,210 Q22,185 32,162 Q38,140 30,118 Q24,102 28,88' stroke='%23f43f5e' stroke-width='7' fill='none' stroke-linecap='round' stroke-dasharray='22,16'/%3E%3C/svg%3E\") center / cover no-repeat";

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
    gradient: "repeating-linear-gradient(180deg, transparent 0px, transparent 14px, rgba(255,255,255,0.08) 14px, rgba(255,255,255,0.08) 16px), linear-gradient(175deg, #0891b2 0%, #0e7490 100%)",
    primary: "oklch(0.55 0.18 200)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "midnight",
    label: "Midnight",
    emoji: "🌙",
    gradient: "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.7) 1px, transparent 2px), radial-gradient(circle at 55% 12%, rgba(255,255,255,0.5) 1px, transparent 2px), radial-gradient(circle at 85% 40%, rgba(255,255,255,0.6) 1px, transparent 2px), radial-gradient(circle at 35% 65%, rgba(255,255,255,0.4) 0.8px, transparent 2px), radial-gradient(circle at 75% 80%, rgba(255,255,255,0.5) 1px, transparent 2px), linear-gradient(175deg, #1e1b4b 0%, #312e81 100%)",
    primary: "oklch(0.30 0.18 280)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "pink",
    label: "Rainbow",
    emoji: "🌈",
    gradient: "linear-gradient(175deg, #f43f5e 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #8b5cf6 100%)",
    primary: "oklch(0.55 0.26 330)",
    primaryFg: "oklch(1 0 0)",
  },
  // ── Illustrated kid themes ────────────────────────────────────────
  {
    name: "space",
    label: "Space",
    emoji: "🚀",
    gradient: SPACE_SVG,
    primary: "oklch(0.55 0.22 270)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "dino",
    label: "Dino",
    emoji: "🦕",
    gradient: DINO_SVG,
    primary: "oklch(0.60 0.22 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "gaming",
    label: "Minecraft",
    emoji: "⛏️",
    gradient: MINECRAFT_SVG,
    primary: "oklch(0.55 0.20 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "candy",
    label: "Candy",
    emoji: "🍭",
    gradient: CANDY_SVG,
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
