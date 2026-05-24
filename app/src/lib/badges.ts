import type { ChoreCompletion } from "./pocketbase";

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
}

function currentStreak(completions: ChoreCompletion[]): number {
  const dates = new Set(completions.map((c) => c.date.slice(0, 10)));
  let s = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) s++;
    else break;
  }
  return s;
}

function maxWeeklyCount(completions: ChoreCompletion[]): number {
  const byWeek: Record<string, number> = {};
  for (const c of completions) {
    const d = new Date(c.date.slice(0, 10) + "T12:00:00");
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const key = `${d.getFullYear()}-${d.getMonth()}-${Math.ceil(d.getDate() / 7)}`;
    byWeek[key] = (byWeek[key] ?? 0) + 1;
  }
  return Math.max(0, ...Object.values(byWeek));
}

export function computeBadges(
  completions: ChoreCompletion[],
  totalPoints: number
): Badge[] {
  const total = completions.length;
  const streak = currentStreak(completions);
  const maxWeekly = maxWeeklyCount(completions);

  return [
    {
      id: "first_step",
      name: "First Step",
      emoji: "🎯",
      description: "Complete your first chore",
      earned: total >= 1,
    },
    {
      id: "busy_bee",
      name: "Busy Bee",
      emoji: "🐝",
      description: "Complete 10 chores",
      earned: total >= 10,
    },
    {
      id: "century",
      name: "Century",
      emoji: "💯",
      description: "Complete 100 chores",
      earned: total >= 100,
    },
    {
      id: "streak_3",
      name: "On a Roll",
      emoji: "🔥",
      description: "3 days in a row",
      earned: streak >= 3,
    },
    {
      id: "streak_7",
      name: "Week Warrior",
      emoji: "🌊",
      description: "7-day streak",
      earned: streak >= 7,
    },
    {
      id: "streak_14",
      name: "Unstoppable",
      emoji: "⚡",
      description: "14-day streak",
      earned: streak >= 14,
    },
    {
      id: "pts_100",
      name: "Point Hunter",
      emoji: "⭐",
      description: "Earn 100 points",
      earned: totalPoints >= 100,
    },
    {
      id: "pts_500",
      name: "500 Club",
      emoji: "💎",
      description: "Earn 500 points",
      earned: totalPoints >= 500,
    },
    {
      id: "pts_1000",
      name: "Legend",
      emoji: "👑",
      description: "Earn 1,000 points",
      earned: totalPoints >= 1000,
    },
    {
      id: "superstar_week",
      name: "Superstar Week",
      emoji: "🏆",
      description: "7+ chores in one week",
      earned: maxWeekly >= 7,
    },
  ];
}
