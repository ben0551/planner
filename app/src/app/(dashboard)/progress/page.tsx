"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type ChoreCompletion } from "@/lib/pocketbase";
import { getLevel, getLevelProgress, LEVELS } from "@/lib/levels";
import { computeBadges } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-W${String(Math.ceil(d.getDate() / 7)).padStart(2, "0")}-${d.getMonth()}`;
}

export default function ProgressPage() {
  const { user, membership, householdId } = useAuth();
  const pb = getClient();

  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const isKid = !!(membership as any)?.pin && membership?.role !== "owner";

  useEffect(() => {
    if (!user || !householdId) return;
    pb.collection("chore_completions")
      .getFullList<ChoreCompletion>({ filter: `user="${user.id}"` })
      .then(setCompletions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, householdId]);

  const totalPoints = completions.reduce((s, c) => s + (c.points ?? 0), 0);
  const level = getLevel(totalPoints);
  const progress = getLevelProgress(totalPoints);
  const badges = computeBadges(completions, totalPoints);
  const earnedBadges = badges.filter((b) => b.earned);

  // ── Heatmap: last 28 days ──────────────────────────────────────
  const completionDates = new Set(completions.map((c) => c.date.slice(0, 10)));
  const heatmapDays: { date: string; active: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = toDateStr(d);
    heatmapDays.push({ date: ds, active: completionDates.has(ds) });
  }

  // ── Points chart: last 8 weeks ─────────────────────────────────
  const weekPoints: Record<string, number> = {};
  for (const c of completions) {
    const key = isoWeekKey(c.date.slice(0, 10));
    weekPoints[key] = (weekPoints[key] ?? 0) + (c.points ?? 0);
  }
  const chartWeeks: { label: string; pts: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = isoWeekKey(toDateStr(d));
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const label = startOfWeek.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
    chartWeeks.push({ label, pts: weekPoints[key] ?? 0 });
  }
  const maxPts = Math.max(1, ...chartWeeks.map((w) => w.pts));

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">My Progress</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <h1 className="text-xl font-bold">My Progress</h1>

      {/* ── Level card ─────────────────────────────────────────── */}
      <div className={cn("rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br", level.color)}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-5xl leading-none drop-shadow">{level.emoji}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Level {level.level}</p>
            <p className="text-2xl font-black leading-tight">{level.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-black">{totalPoints}</p>
            <p className="text-xs opacity-80">total pts</p>
          </div>
        </div>

        {progress.toNext !== null ? (
          <>
            <div className="h-3 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${Math.round(progress.pct * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs opacity-80">
              <span>{progress.inLevel} pts in this level</span>
              <span>{progress.toNext} pts to {LEVELS[level.level]?.name ?? "next"} {LEVELS[level.level]?.emoji}</span>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold opacity-90 mt-1">👑 Maximum level reached!</p>
        )}
      </div>

      {/* ── This week stats ────────────────────────────────────── */}
      {(() => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        const wsStr = toDateStr(weekStart);
        const thisWeek = completions.filter((c) => c.date.slice(0, 10) >= wsStr);
        const weekPts = thisWeek.reduce((s, c) => s + (c.points ?? 0), 0);
        return (
          <div className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 flex gap-4">
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-primary">{thisWeek.length}</span>
              <span className="text-xs text-muted-foreground font-medium">chores this week</span>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-amber-500 flex items-center gap-1">
                <Star className="h-5 w-5 fill-amber-400 stroke-amber-400" />{weekPts}
              </span>
              <span className="text-xs text-muted-foreground font-medium">pts this week</span>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-foreground">{completions.length}</span>
              <span className="text-xs text-muted-foreground font-medium">total chores</span>
            </div>
          </div>
        );
      })()}

      {/* ── Heatmap: last 28 days ──────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b">
          <h2 className="font-bold text-sm">Activity — last 28 days</h2>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-7 gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-[10px] text-muted-foreground font-semibold text-center pb-0.5">{d}</div>
            ))}
            {/* pad to start on correct weekday */}
            {Array.from({ length: heatmapDays[0] ? (new Date(heatmapDays[0].date + "T12:00:00").getDay() + 6) % 7 : 0 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {heatmapDays.map(({ date, active }) => (
              <div
                key={date}
                title={date}
                className={cn(
                  "aspect-square rounded-md",
                  active ? "bg-emerald-400" : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            <div className="h-3 w-3 rounded bg-muted" />
            <span className="text-[10px] text-muted-foreground">None</span>
            <div className="h-3 w-3 rounded bg-emerald-400 ml-1" />
            <span className="text-[10px] text-muted-foreground">Active</span>
          </div>
        </div>
      </div>

      {/* ── Points chart: last 8 weeks ─────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b">
          <h2 className="font-bold text-sm">Points per week</h2>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-end gap-1.5 h-28">
            {chartWeeks.map(({ label, pts }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                  <div
                    className="w-full rounded-t-md bg-primary/80 transition-all duration-500 min-h-[2px]"
                    style={{ height: `${Math.round((pts / maxPts) * 80)}px` }}
                    title={`${pts} pts`}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Badges ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b flex items-center justify-between">
          <h2 className="font-bold text-sm">Badges</h2>
          <span className="text-xs text-muted-foreground">{earnedBadges.length}/{badges.length} earned</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-all",
                badge.earned
                  ? "bg-amber-50 border-amber-200"
                  : "bg-muted/30 border-border opacity-50 grayscale"
              )}
            >
              <span className="text-2xl leading-none shrink-0">{badge.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Level roadmap ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b">
          <h2 className="font-bold text-sm">Level roadmap</h2>
        </div>
        <div className="flex flex-col divide-y">
          {LEVELS.map((lv) => {
            const isCurrentLevel = lv.level === level.level;
            const isPast = lv.level < level.level;
            return (
              <div
                key={lv.level}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  isCurrentLevel && "bg-primary/5"
                )}
              >
                <span className={cn("text-xl shrink-0", !isPast && !isCurrentLevel && "grayscale opacity-40")}>
                  {lv.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-bold", !isPast && !isCurrentLevel && "text-muted-foreground")}>
                    {lv.name}
                    {isCurrentLevel && <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">You are here</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lv.minPts}{lv.nextPts ? `–${lv.nextPts - 1}` : "+"} pts
                  </p>
                </div>
                {isPast && <span className="text-emerald-500 text-sm shrink-0">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
