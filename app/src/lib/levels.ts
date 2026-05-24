export interface Level {
  level: number;
  name: string;
  emoji: string;
  minPts: number;
  nextPts: number | null; // null = max level
  color: string; // tailwind gradient classes
}

export const LEVELS: Level[] = [
  { level: 1, name: "Sprout",      emoji: "🌱", minPts: 0,    nextPts: 50,   color: "from-emerald-400 to-green-500" },
  { level: 2, name: "Star",        emoji: "⭐", minPts: 50,   nextPts: 150,  color: "from-yellow-400 to-amber-500" },
  { level: 3, name: "Rising Star", emoji: "🌟", minPts: 150,  nextPts: 350,  color: "from-amber-400 to-orange-500" },
  { level: 4, name: "Blazer",      emoji: "🔥", minPts: 350,  nextPts: 700,  color: "from-orange-400 to-red-500" },
  { level: 5, name: "Champion",    emoji: "🏆", minPts: 700,  nextPts: 1200, color: "from-violet-400 to-purple-600" },
  { level: 6, name: "Hero",        emoji: "🦸", minPts: 1200, nextPts: 2000, color: "from-blue-400 to-indigo-600" },
  { level: 7, name: "Legend",      emoji: "👑", minPts: 2000, nextPts: null, color: "from-rose-400 to-pink-600" },
];

export function getLevel(pts: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (pts >= LEVELS[i].minPts) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getLevelProgress(pts: number): {
  pct: number;
  inLevel: number;
  toNext: number | null;
} {
  const lv = getLevel(pts);
  if (lv.nextPts === null) return { pct: 1, inLevel: pts - lv.minPts, toNext: null };
  const inLevel = pts - lv.minPts;
  const range = lv.nextPts - lv.minPts;
  return { pct: inLevel / range, inLevel, toNext: lv.nextPts - pts };
}
