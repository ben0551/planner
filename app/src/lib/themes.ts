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
// Minecraft: world cross-section — sky, clouds, creeper, grass, dirt, stone, diamond ore
const MINECRAFT_SVG = "linear-gradient(rgba(0,0,0,0.18),rgba(0,0,0,0.18)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%2387CEEB'/%3E%3Crect x='155' y='14' width='18' height='18' fill='%23FFE57A'/%3E%3Crect x='152' y='18' width='24' height='10' fill='%23FFE57A'/%3E%3Crect x='159' y='10' width='10' height='26' fill='%23FFE57A'/%3E%3Crect x='18' y='32' width='44' height='12' fill='white'/%3E%3Crect x='24' y='22' width='32' height='14' fill='white'/%3E%3Crect x='14' y='38' width='14' height='8' fill='white'/%3E%3Crect x='108' y='48' width='38' height='12' fill='white'/%3E%3Crect x='116' y='38' width='22' height='14' fill='white'/%3E%3Crect x='62' y='78' width='24' height='24' fill='%234a7c3a'/%3E%3Crect x='62' y='78' width='24' height='4' fill='%2372c53a'/%3E%3Crect x='67' y='84' width='6' height='6' fill='%231a1a1a'/%3E%3Crect x='79' y='84' width='6' height='6' fill='%231a1a1a'/%3E%3Crect x='70' y='92' width='12' height='3' fill='%231a1a1a'/%3E%3Crect x='70' y='95' width='4' height='5' fill='%231a1a1a'/%3E%3Crect x='78' y='95' width='4' height='5' fill='%231a1a1a'/%3E%3Crect width='200' height='22' y='112' fill='%235DA02A'/%3E%3Crect width='200' height='5' y='112' fill='%2372D336'/%3E%3Crect x='20' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='40' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='60' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='80' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='100' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='120' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='140' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='160' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='180' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect width='200' height='82' y='134' fill='%238B5E3C'/%3E%3Crect x='6' y='144' width='8' height='6' fill='%23704B2B' opacity='.6'/%3E%3Crect x='32' y='158' width='7' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='58' y='146' width='8' height='6' fill='%23704B2B' opacity='.6'/%3E%3Crect x='80' y='166' width='7' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='104' y='143' width='6' height='7' fill='%23704B2B' opacity='.6'/%3E%3Crect x='128' y='160' width='8' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='152' y='147' width='7' height='6' fill='%23704B2B' opacity='.6'/%3E%3Crect x='176' y='163' width='7' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='14' y='172' width='8' height='6' fill='%23704B2B' opacity='.5'/%3E%3Crect x='44' y='180' width='6' height='5' fill='%23704B2B' opacity='.4'/%3E%3Crect x='70' y='175' width='8' height='6' fill='%23704B2B' opacity='.5'/%3E%3Crect x='96' y='185' width='7' height='5' fill='%23704B2B' opacity='.4'/%3E%3Crect x='140' y='176' width='8' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='168' y='182' width='6' height='6' fill='%23704B2B' opacity='.4'/%3E%3Crect width='200' height='1' y='154' fill='%23704B2B' opacity='.3'/%3E%3Crect width='200' height='1' y='174' fill='%23704B2B' opacity='.3'/%3E%3Crect width='200' height='1' y='194' fill='%23704B2B' opacity='.3'/%3E%3Crect x='20' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='40' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='60' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='80' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='100' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='120' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='140' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='160' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='180' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect width='200' height='84' y='216' fill='%23888'/%3E%3Crect x='0' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='40' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='80' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='120' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='160' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='20' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='60' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='100' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='140' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='180' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect width='200' height='1' y='236' fill='%23555' opacity='.4'/%3E%3Crect width='200' height='1' y='256' fill='%23555' opacity='.4'/%3E%3Crect width='200' height='1' y='276' fill='%23555' opacity='.4'/%3E%3Crect x='20' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='40' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='60' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='80' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='100' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='120' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='140' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='160' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='180' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='26' y='256' width='8' height='8' fill='%2300d4ff' opacity='.9'/%3E%3Crect x='28' y='253' width='4' height='14' fill='%2300d4ff' opacity='.7'/%3E%3Crect x='86' y='268' width='8' height='8' fill='%2300d4ff' opacity='.9'/%3E%3Crect x='88' y='265' width='4' height='14' fill='%2300d4ff' opacity='.7'/%3E%3Crect x='152' y='258' width='8' height='8' fill='%2300d4ff' opacity='.9'/%3E%3Crect x='154' y='255' width='4' height='14' fill='%2300d4ff' opacity='.7'/%3E%3C/svg%3E\") center / cover no-repeat";

// Space: sparse star field — 200×200 tile so stars are well spread out
const SPACE_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%230d0a2e'/%3E%3Ccircle cx='22' cy='38' r='2' fill='white' opacity='.9'/%3E%3Ccircle cx='110' cy='15' r='1.2' fill='white' opacity='.7'/%3E%3Ccircle cx='175' cy='70' r='2.5' fill='white' opacity='.6'/%3E%3Ccircle cx='55' cy='130' r='1.5' fill='white' opacity='.8'/%3E%3Ccircle cx='160' cy='155' r='1.8' fill='white' opacity='.7'/%3E%3Ccircle cx='12' cy='175' r='1' fill='white' opacity='.5'/%3E%3Ccircle cx='88' cy='88' r='1.2' fill='white' opacity='.9'/%3E%3Cpath d='M142,50 L144,55.5 L150,58 L144,60.5 L142,66 L140,60.5 L134,58 L140,55.5Z' fill='white' opacity='.85'/%3E%3Ccircle cx='68' cy='178' r='10' fill='%23ffe566'/%3E%3Ccircle cx='74' cy='172' r='9' fill='%230d0a2e'/%3E%3Cg transform='translate(155,120) rotate(-25)'%3E%3Crect x='-5' y='-12' width='10' height='18' rx='5' fill='%23c0c8ff'/%3E%3Cpolygon points='-5,-12 5,-12 0,-20' fill='%23ff4444'/%3E%3Crect x='-8' y='4' width='5' height='7' rx='2' fill='%23ff6b35'/%3E%3Crect x='3' y='4' width='5' height='7' rx='2' fill='%23ff6b35'/%3E%3C/g%3E%3C/svg%3E\") 0 0 / 200px 200px repeat";

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
