"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Goal, type ChoreCompletion, type CachedMember } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Trophy, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function weekStartStr() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function motivationalMessage(current: number, target: number): string {
  const remaining = target - current;
  const pct = current / target;
  if (pct >= 1) return "Goal reached! 🎉";
  if (pct >= 0.9) return `Almost there! Just ${remaining} more point${remaining === 1 ? "" : "s"} to go!`;
  if (pct >= 0.75) return `So close! Only ${remaining} pts to go!`;
  if (pct >= 0.5) return `Over halfway there! ${remaining} pts left!`;
  if (pct >= 0.25) return `Keep it up! ${remaining} pts to go!`;
  return `${remaining} pts to reach your goal. You've got this!`;
}

interface MemberPoints {
  member: CachedMember;
  weekPoints: number;
  totalPoints: number;
}

export default function RewardsPage() {
  const { user, membership, householdId } = useAuth();
  const pb = getClient();

  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ userId: "", title: "", target: 100, reward: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwner = membership?.role === "owner";

  useEffect(() => {
    if (!householdId) return;

    async function load() {
      const cachedStr = typeof window !== "undefined" ? localStorage.getItem("planner_members") : null;
      const members: CachedMember[] = cachedStr ? JSON.parse(cachedStr) : [];

      const weekStart = weekStartStr();
      const [allCompletions, weekCompletions, fetchedGoals] = await Promise.all([
        pb.collection("chore_completions").getFullList<ChoreCompletion>({
          filter: `chore.household="${householdId}"`,
        }),
        pb.collection("chore_completions").getFullList<ChoreCompletion>({
          filter: `chore.household="${householdId}" && date >= "${weekStart}"`,
        }),
        pb.collection("goals").getFullList<Goal>({
          filter: `household="${householdId}"`,
        }),
      ]);

      const totalByUser: Record<string, number> = {};
      for (const c of allCompletions) {
        totalByUser[c.user] = (totalByUser[c.user] ?? 0) + (c.points ?? 0);
      }
      const weekByUser: Record<string, number> = {};
      for (const c of weekCompletions) {
        weekByUser[c.user] = (weekByUser[c.user] ?? 0) + (c.points ?? 0);
      }

      const mp: MemberPoints[] = members.map((m) => ({
        member: m,
        weekPoints: weekByUser[m.userId] ?? 0,
        totalPoints: totalByUser[m.userId] ?? 0,
      })).sort((a, b) => b.totalPoints - a.totalPoints);

      setMemberPoints(mp);
      setGoals(fetchedGoals);
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [householdId]);

  async function saveGoal() {
    if (!goalForm.title.trim() || !goalForm.userId || !householdId) return;
    setSaving(true);
    try {
      const created = await pb.collection("goals").create({
        household: householdId,
        user: goalForm.userId,
        title: goalForm.title.trim(),
        target_points: goalForm.target,
        reward_description: goalForm.reward.trim() || undefined,
        achieved: false,
      });
      setGoals((prev) => [...prev, created as unknown as Goal]);
      setShowGoalForm(false);
      setGoalForm({ userId: "", title: "", target: 100, reward: "" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    await pb.collection("goals").delete(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function markAchieved(goal: Goal) {
    const updated = await pb.collection("goals").update(goal.id, { achieved: !goal.achieved });
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, achieved: updated.achieved } : g));
  }

  const maxTotal = Math.max(1, ...memberPoints.map((m) => m.totalPoints));
  const kids = memberPoints.filter((m) => m.member.hasPin);
  const allMembers = memberPoints;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" /> Rewards
      </h1>

      {/* Leaderboard */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b">
          <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
          <h2 className="font-bold text-sm">Leaderboard</h2>
        </div>
        {loading ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="divide-y">
            {allMembers.map((mp, i) => (
              <div key={mp.member.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{mp.member.name.split(" ")[0]}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${(mp.totalPoints / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-600">{mp.totalPoints} pts</p>
                  <p className="text-[10px] text-muted-foreground">+{mp.weekPoints} this wk</p>
                </div>
              </div>
            ))}
            {allMembers.length === 0 && (
              <div className="px-4 py-4 text-sm text-muted-foreground">No points earned yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            <h2 className="font-bold text-sm">Goals</h2>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowGoalForm((v) => !v)}
              className="text-xs text-orange-500 font-medium hover:underline"
            >
              {showGoalForm ? "Cancel" : "+ New goal"}
            </button>
          )}
        </div>

        {showGoalForm && (
          <div className="px-4 py-3 border-b bg-muted/20 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">For</Label>
                <select
                  value={goalForm.userId}
                  onChange={(e) => setGoalForm((f) => ({ ...f, userId: e.target.value }))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Pick a person…</option>
                  {allMembers.map((mp) => (
                    <option key={mp.member.userId} value={mp.member.userId}>{mp.member.name.split(" ")[0]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Target pts</Label>
                <Input
                  type="number"
                  min={1}
                  value={goalForm.target}
                  onChange={(e) => setGoalForm((f) => ({ ...f, target: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Goal title</Label>
              <Input
                value={goalForm.title}
                onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Stay up late Friday"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Reward description (optional)</Label>
              <Input
                value={goalForm.reward}
                onChange={(e) => setGoalForm((f) => ({ ...f, reward: e.target.value }))}
                placeholder="e.g. Pick a movie for family night"
              />
            </div>
            <Button size="sm" onClick={saveGoal} disabled={saving || !goalForm.title.trim() || !goalForm.userId}>
              {saving ? "Saving…" : "Add goal"}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">Loading…</div>
        ) : goals.length === 0 ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">
            {isOwner ? "No goals yet — add one above to motivate the kids!" : "No goals set yet."}
          </div>
        ) : (
          <div className="divide-y">
            {goals.map((goal) => {
              const mp = allMembers.find((m) => m.member.userId === goal.user);
              const currentPts = mp?.totalPoints ?? 0;
              const pct = Math.min(1, currentPts / goal.target_points);
              const isMe = user?.id === goal.user;
              return (
                <div key={goal.id} className={cn("px-4 py-3", goal.achieved && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{goal.title}</p>
                        {goal.achieved && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      </div>
                      {mp && <p className="text-xs text-muted-foreground">{mp.member.name.split(" ")[0]}</p>}
                      {goal.reward_description && (
                        <p className="text-xs text-violet-600 mt-0.5">🎁 {goal.reward_description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-600">{currentPts} / {goal.target_points} pts</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", pct >= 1 ? "bg-emerald-400" : "bg-violet-400")}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  {!goal.achieved && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isMe || !isOwner ? motivationalMessage(currentPts, goal.target_points) : motivationalMessage(currentPts, goal.target_points)}
                    </p>
                  )}
                  {isOwner && (
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => markAchieved(goal)} className="text-[11px] text-emerald-600 hover:underline">
                        {goal.achieved ? "Unmark achieved" : "Mark achieved"}
                      </button>
                      <button onClick={() => deleteGoal(goal.id)} className="text-[11px] text-muted-foreground hover:text-destructive">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
