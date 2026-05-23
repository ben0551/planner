"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Goal, type ChoreCompletion, type CachedMember, type Membership, type BalanceTransaction } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Trophy, Target, CheckCircle2, Lock, Wallet, Plus, Minus, RotateCw, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function weekStartStr() {
  const stored = typeof window !== "undefined" ? localStorage.getItem("planner_week_start") : null;
  const d = new Date();
  const day = d.getDay();
  if (stored === "sun") {
    d.setDate(d.getDate() - day);
  } else {
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function motivationalMessage(current: number, target: number): string {
  const remaining = target - current;
  const pct = current / target;
  if (pct >= 1) return "Goal reached!";
  if (pct >= 0.9) return `Almost there! Just ${remaining} more point${remaining === 1 ? "" : "s"} to go!`;
  if (pct >= 0.75) return `So close! Only ${remaining} pts to go!`;
  if (pct >= 0.5) return `Over halfway! ${remaining} pts left!`;
  if (pct >= 0.25) return `Keep it up! ${remaining} pts to go!`;
  return `${remaining} pts to reach your goal. You've got this!`;
}

interface MemberPoints {
  member: CachedMember;
  weekPoints: number;
  totalPoints: number;
}

interface KidBalance {
  membership: Membership;
  totalPoints: number;
  showHistory: boolean;
  history: BalanceTransaction[] | null;
  historyLoading: boolean;
}

export default function RewardsPage() {
  const { user, membership, householdId } = useAuth();
  const pb = getClient();

  const [memberPoints, setMemberPoints] = useState<MemberPoints[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [kidBalances, setKidBalances] = useState<KidBalance[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({ shared: false, userId: "", userIds: [] as string[], title: "", target: 100, reward: "", private: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeBalanceKid, setActiveBalanceKid] = useState<string | null>(null);
  const [balanceAction, setBalanceAction] = useState<"add" | "debit" | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDesc, setBalanceDesc] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [editRateId, setEditRateId] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState("");

  const isOwner = membership?.role === "owner";

  useEffect(() => {
    if (!householdId) return;
    loadAll();
  }, [householdId]);

  async function loadAll() {
    const cachedStr = typeof window !== "undefined" ? localStorage.getItem("planner_members") : null;
    const members: CachedMember[] = cachedStr ? JSON.parse(cachedStr) : [];

    const weekStart = weekStartStr();
    const [allCompletions, weekCompletions, fetchedGoals, allMemberships] = await Promise.all([
      pb.collection("chore_completions").getFullList<ChoreCompletion>({
        filter: `chore.household="${householdId}"`,
      }),
      pb.collection("chore_completions").getFullList<ChoreCompletion>({
        filter: `chore.household="${householdId}" && date >= "${weekStart}"`,
      }),
      pb.collection("goals").getFullList<Goal>({ filter: `household="${householdId}"` }),
      pb.collection("memberships").getFullList<Membership>({
        filter: `household="${householdId}"`,
        expand: "user",
      }),
    ]);

    const totalByUser: Record<string, number> = {};
    for (const c of allCompletions) totalByUser[c.user] = (totalByUser[c.user] ?? 0) + (c.points ?? 0);
    const weekByUser: Record<string, number> = {};
    for (const c of weekCompletions) weekByUser[c.user] = (weekByUser[c.user] ?? 0) + (c.points ?? 0);

    const mp: MemberPoints[] = members
      .map((m) => ({ member: m, weekPoints: weekByUser[m.userId] ?? 0, totalPoints: totalByUser[m.userId] ?? 0 }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    setMemberPoints(mp);
    setGoals(fetchedGoals);

    const kidMembers = allMemberships.filter((m) => m.pin && (isOwner || m.user === user?.id));
    setKidBalances(
      kidMembers.map((m) => ({
        membership: m,
        totalPoints: totalByUser[m.user] ?? 0,
        showHistory: false,
        history: null,
        historyLoading: false,
      })),
    );
    setLoading(false);
  }

  function memberName(kb: KidBalance) {
    return (memberPoints.find((mp) => mp.member.userId === kb.membership.user)?.member.name ?? "Kid").split(" ")[0];
  }

  function unconvertedPts(kb: KidBalance) {
    return Math.max(0, kb.totalPoints - (kb.membership.converted_points ?? 0));
  }

  function ptsAsDollars(kb: KidBalance, pts?: number) {
    const rate = kb.membership.points_per_dollar ?? 0;
    if (!rate) return null;
    return ((pts ?? unconvertedPts(kb)) / rate).toFixed(2);
  }

  async function toggleHistory(membershipId: string) {
    setKidBalances((prev) =>
      prev.map((kb) => {
        if (kb.membership.id !== membershipId) return kb;
        if (kb.showHistory) return { ...kb, showHistory: false };
        if (kb.history !== null) return { ...kb, showHistory: true };
        fetchHistory(membershipId);
        return { ...kb, showHistory: true, historyLoading: true };
      }),
    );
  }

  async function fetchHistory(membershipId: string) {
    const txns = await pb.collection("balance_transactions").getFullList<BalanceTransaction>({
      filter: `membership="${membershipId}"`,
      sort: "-created",
    });
    setKidBalances((prev) =>
      prev.map((kb) => (kb.membership.id === membershipId ? { ...kb, history: txns, historyLoading: false } : kb)),
    );
  }

  function pushTxnLocally(membershipId: string, txn: BalanceTransaction) {
    setKidBalances((prev) =>
      prev.map((kb) =>
        kb.membership.id === membershipId && kb.history !== null
          ? { ...kb, history: [txn, ...kb.history] }
          : kb,
      ),
    );
  }

  async function submitBalanceAction(membershipId: string) {
    const kb = kidBalances.find((k) => k.membership.id === membershipId);
    if (!kb || !balanceAction || !balanceAmount) return;
    const amt = parseFloat(balanceAmount);
    if (isNaN(amt) || amt <= 0) return;
    setBalanceSaving(true);
    try {
      const signedAmt = balanceAction === "debit" ? -amt : amt;
      const newBalance = (kb.membership.balance ?? 0) + signedAmt;
      const [, txn] = await Promise.all([
        pb.collection("memberships").update(membershipId, { balance: newBalance }),
        pb.collection("balance_transactions").create<BalanceTransaction>({
          household: householdId,
          membership: membershipId,
          amount: signedAmt,
          description: balanceDesc.trim() || undefined,
          type: balanceAction === "add" ? "allowance" : "purchase",
        }),
      ]);
      setKidBalances((prev) =>
        prev.map((k) =>
          k.membership.id === membershipId
            ? { ...k, membership: { ...k.membership, balance: newBalance } }
            : k,
        ),
      );
      pushTxnLocally(membershipId, txn as unknown as BalanceTransaction);
      setActiveBalanceKid(null);
      setBalanceAction(null);
      setBalanceAmount("");
      setBalanceDesc("");
    } finally {
      setBalanceSaving(false);
    }
  }

  async function convertPoints(membershipId: string) {
    const kb = kidBalances.find((k) => k.membership.id === membershipId);
    if (!kb) return;
    const rate = kb.membership.points_per_dollar ?? 0;
    if (!rate) return;
    const pts = unconvertedPts(kb);
    if (pts <= 0) return;
    const dollars = parseFloat((pts / rate).toFixed(2));
    if (!confirm(`Convert ${pts} pts → $${dollars.toFixed(2)} for ${memberName(kb)}?`)) return;
    setBalanceSaving(true);
    try {
      const newBalance = (kb.membership.balance ?? 0) + dollars;
      const newConverted = (kb.membership.converted_points ?? 0) + pts;
      const [, txn] = await Promise.all([
        pb.collection("memberships").update(membershipId, { balance: newBalance, converted_points: newConverted }),
        pb.collection("balance_transactions").create<BalanceTransaction>({
          household: householdId,
          membership: membershipId,
          amount: dollars,
          description: `${pts} points converted`,
          type: "points_conversion",
        }),
      ]);
      setKidBalances((prev) =>
        prev.map((k) =>
          k.membership.id === membershipId
            ? { ...k, membership: { ...k.membership, balance: newBalance, converted_points: newConverted } }
            : k,
        ),
      );
      pushTxnLocally(membershipId, txn as unknown as BalanceTransaction);
    } finally {
      setBalanceSaving(false);
    }
  }

  async function saveRate(membershipId: string) {
    const rate = parseFloat(rateInput);
    if (isNaN(rate) || rate <= 0) { setEditRateId(null); return; }
    await pb.collection("memberships").update(membershipId, { points_per_dollar: rate });
    setKidBalances((prev) =>
      prev.map((k) =>
        k.membership.id === membershipId
          ? { ...k, membership: { ...k.membership, points_per_dollar: rate } }
          : k,
      ),
    );
    setEditRateId(null);
  }

  function startEditGoal(goal: Goal) {
    setEditingGoalId(goal.id);
    const isShared = Array.isArray(goal.users) && goal.users.length >= 2;
    setGoalForm({
      shared: isShared,
      userId: isShared ? goal.users![0] : goal.user,
      userIds: isShared ? goal.users! : [],
      title: goal.title,
      target: goal.target_points,
      reward: goal.reward_description ?? "",
      private: goal.private ?? false,
    });
    setShowGoalForm(true);
  }

  function cancelGoalForm() {
    setShowGoalForm(false);
    setEditingGoalId(null);
    setGoalForm({ shared: false, userId: "", userIds: [], title: "", target: 100, reward: "", private: false });
  }

  async function saveGoal() {
    if (!goalForm.title.trim() || !householdId) return;
    if (!goalForm.shared && !goalForm.userId) return;
    if (goalForm.shared && goalForm.userIds.length < 2) return;
    setSaving(true);
    try {
      const users = goalForm.shared ? goalForm.userIds : [];
      const primaryUser = goalForm.shared ? goalForm.userIds[0] : goalForm.userId;
      const payload = {
        household: householdId,
        user: primaryUser,
        users,
        title: goalForm.title.trim(),
        target_points: goalForm.target,
        reward_description: goalForm.reward.trim() || undefined,
        private: goalForm.private,
      };
      if (editingGoalId) {
        const updated = await pb.collection("goals").update(editingGoalId, payload);
        setGoals((prev) => prev.map((g) => (g.id === editingGoalId ? (updated as unknown as Goal) : g)));
      } else {
        const created = await pb.collection("goals").create({ ...payload, achieved: false });
        setGoals((prev) => [...prev, created as unknown as Goal]);
      }
      cancelGoalForm();
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
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, achieved: updated.achieved } : g)));
  }

  const maxTotal = Math.max(1, ...memberPoints.map((m) => m.totalPoints));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" /> Rewards
      </h1>

      {/* Allowance / Balance */}
      {!loading && kidBalances.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <h2 className="font-bold text-sm">Allowance</h2>
          </div>
          <div className="divide-y">
            {kidBalances.map((kb) => (
              <div key={kb.membership.id} className="px-4 py-3">
                {/* Balance header */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{memberName(kb)}</p>
                    <p className="text-xs text-muted-foreground">
                      {unconvertedPts(kb)} pts unconverted
                      {!!(kb.membership.points_per_dollar) && ptsAsDollars(kb) !== null && ` (≈ $${ptsAsDollars(kb)})`}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${(kb.membership.balance ?? 0).toFixed(2)}
                  </p>
                </div>

                {/* Rate + convert (owner only) */}
                {isOwner && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {editRateId === kb.membership.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={rateInput}
                          onChange={(e) => setRateInput(e.target.value)}
                          placeholder="pts per $1"
                          className="h-7 w-28 text-xs"
                          type="number"
                          min={1}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") saveRate(kb.membership.id); if (e.key === "Escape") setEditRateId(null); }}
                        />
                        <button onClick={() => saveRate(kb.membership.id)} className="text-xs text-primary hover:underline">Save</button>
                        <button onClick={() => setEditRateId(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditRateId(kb.membership.id); setRateInput(String(kb.membership.points_per_dollar ?? "")); }}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {kb.membership.points_per_dollar ? `${kb.membership.points_per_dollar} pts = $1` : "Set conversion rate"}
                      </button>
                    )}
                    {!!(kb.membership.points_per_dollar) && unconvertedPts(kb) > 0 && (
                      <button
                        onClick={() => convertPoints(kb.membership.id)}
                        disabled={balanceSaving}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:underline disabled:opacity-50"
                      >
                        <RotateCw className="h-3 w-3" />
                        Convert {unconvertedPts(kb)} pts → ${ptsAsDollars(kb)}
                      </button>
                    )}
                  </div>
                )}

                {/* Add / debit (owner only) */}
                {isOwner && (
                  <div className="mt-2">
                    {activeBalanceKid === kb.membership.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          {(["add", "debit"] as const).map((action) => (
                            <button
                              key={action}
                              onClick={() => setBalanceAction(action)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1 text-xs rounded-lg border py-1.5 transition-colors",
                                balanceAction === action
                                  ? action === "add" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-rose-50 border-rose-400 text-rose-700"
                                  : "border-border text-muted-foreground hover:bg-muted/30",
                              )}
                            >
                              {action === "add" ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                              {action === "add" ? "Add money" : "Debit"}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            placeholder="Amount $"
                            className="h-8 text-sm w-28"
                            type="number"
                            min={0.01}
                            step={0.01}
                            autoFocus
                          />
                          <Input
                            value={balanceDesc}
                            onChange={(e) => setBalanceDesc(e.target.value)}
                            placeholder="Note (optional)"
                            className="h-8 text-sm flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={!balanceAction || !balanceAmount || balanceSaving}
                            onClick={() => submitBalanceAction(kb.membership.id)}
                          >
                            {balanceSaving ? "Saving…" : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl"
                            onClick={() => { setActiveBalanceKid(null); setBalanceAction(null); setBalanceAmount(""); setBalanceDesc(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setActiveBalanceKid(kb.membership.id)} className="text-xs text-primary hover:underline">
                        + Adjust balance
                      </button>
                    )}
                  </div>
                )}

                {/* History */}
                <button
                  onClick={() => toggleHistory(kb.membership.id)}
                  className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {kb.showHistory ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  History
                </button>
                {kb.showHistory && (
                  <div className="mt-1.5 rounded-xl bg-muted/30 px-3 py-2 flex flex-col gap-1">
                    {kb.historyLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                    {kb.history?.length === 0 && <p className="text-xs text-muted-foreground">No transactions yet.</p>}
                    {kb.history?.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-semibold w-14 text-right",
                              txn.amount >= 0 ? "text-emerald-600" : "text-rose-600",
                            )}
                          >
                            {txn.amount >= 0 ? "+" : ""}${txn.amount.toFixed(2)}
                          </span>
                          {txn.description && <span className="text-muted-foreground">{txn.description}</span>}
                        </div>
                        <span className="text-muted-foreground shrink-0">{new Date(txn.created).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b">
          <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
          <h2 className="font-bold text-sm">Leaderboard</h2>
        </div>
        {loading ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="divide-y">
            {memberPoints.map((mp, i) => (
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
            {memberPoints.length === 0 && (
              <div className="px-4 py-4 text-sm text-muted-foreground">No points earned yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            <h2 className="font-bold text-sm">Goals</h2>
          </div>
          {isOwner && (
            <button
              onClick={() => (showGoalForm ? cancelGoalForm() : setShowGoalForm(true))}
              className="text-xs text-orange-500 font-medium hover:underline"
            >
              {showGoalForm ? "Cancel" : "+ New goal"}
            </button>
          )}
        </div>

        {showGoalForm && (
          <div className="px-4 py-3 border-b bg-muted/20 flex flex-col gap-3">
            {/* Shared toggle */}
            <div className="flex gap-1 self-start bg-muted/60 rounded-lg p-0.5">
              {([false, true] as const).map((s) => (
                <button key={String(s)}
                  onClick={() => setGoalForm((f) => ({ ...f, shared: s, userId2: "" }))}
                  className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    goalForm.shared === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {s ? "👥 Shared between 2" : "👤 Individual"}
                </button>
              ))}
            </div>

            {goalForm.shared ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Participants <span className="text-muted-foreground">(select 2 or more)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {memberPoints.map((mp) => {
                    const checked = goalForm.userIds.includes(mp.member.userId);
                    return (
                      <label key={mp.member.userId}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-xs font-medium transition-colors select-none",
                          checked ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/30"
                        )}>
                        <input type="checkbox" className="hidden" checked={checked}
                          onChange={(e) => setGoalForm((f) => ({
                            ...f,
                            userIds: e.target.checked
                              ? [...f.userIds, mp.member.userId]
                              : f.userIds.filter((id) => id !== mp.member.userId),
                          }))} />
                        {mp.member.name.split(" ")[0]}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">For</Label>
                <select
                  value={goalForm.userId}
                  onChange={(e) => setGoalForm((f) => ({ ...f, userId: e.target.value }))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Pick a person…</option>
                  {memberPoints.map((mp) => (
                    <option key={mp.member.userId} value={mp.member.userId}>{mp.member.name.split(" ")[0]}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{goalForm.shared ? "Combined target pts" : "Target pts"}</Label>
              <Input type="number" min={1} value={goalForm.target} onChange={(e) => setGoalForm((f) => ({ ...f, target: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Goal title</Label>
              <Input value={goalForm.title} onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Stay up late Friday" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Reward description (optional)</Label>
              <Input value={goalForm.reward} onChange={(e) => setGoalForm((f) => ({ ...f, reward: e.target.value }))} placeholder="e.g. Pick a movie for family night" />
            </div>
            {!goalForm.shared && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={goalForm.private} onChange={(e) => setGoalForm((f) => ({ ...f, private: e.target.checked }))} className="accent-primary" />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private — only visible to this child and you
                </span>
              </label>
            )}
            <Button size="sm" onClick={saveGoal}
              disabled={saving || !goalForm.title.trim() || (!goalForm.shared && !goalForm.userId) || (goalForm.shared && goalForm.userIds.length < 2)}>
              {saving ? "Saving…" : editingGoalId ? "Save changes" : "Add goal"}
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
            {goals
              .filter((goal) => {
                if (isOwner) return true;
                const sharedUsers = Array.isArray(goal.users) && goal.users.length >= 2 ? goal.users : null;
                if (sharedUsers) return sharedUsers.includes(user?.id ?? "");
                if (goal.private) return user?.id === goal.user;
                return true;
              })
              .map((goal) => {
                const isShared = Array.isArray(goal.users) && goal.users.length >= 2;
                const sharedMps = isShared ? (goal.users as string[]).map((uid) => memberPoints.find((m) => m.member.userId === uid)).filter(Boolean) : null;
                const mp = memberPoints.find((m) => m.member.userId === goal.user);
                const currentPts = isShared
                  ? (sharedMps ?? []).reduce((sum, m) => sum + (m?.totalPoints ?? 0), 0)
                  : (mp?.totalPoints ?? 0);
                const pct = Math.min(1, currentPts / goal.target_points);
                const nameLabel = isShared
                  ? (sharedMps ?? []).map((m) => m?.member.name.split(" ")[0]).filter(Boolean).join(" + ")
                  : mp?.member.name.split(" ")[0];
                return (
                  <div key={goal.id} className={cn("px-4 py-3", goal.achieved && "opacity-60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{goal.title}</p>
                          {goal.achieved && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                          {goal.private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                        {nameLabel && (
                          <p className="text-xs text-muted-foreground">
                            {isShared && <span className="mr-1">👥</span>}{nameLabel}
                            {isShared && <span className="ml-1 text-muted-foreground/60">— combined pts</span>}
                          </p>
                        )}
                        {isShared && sharedMps && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {sharedMps.map((m) => `${m?.member.name.split(" ")[0]}: ${m?.totalPoints ?? 0}`).join("  ·  ")}
                          </p>
                        )}
                        {goal.reward_description && <p className="text-xs text-violet-600 mt-0.5">🎁 {goal.reward_description}</p>}
                      </div>
                      <p className="text-xs font-bold text-amber-600 shrink-0">{currentPts} / {goal.target_points} pts</p>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", pct >= 1 ? "bg-emerald-400" : "bg-violet-400")} style={{ width: `${pct * 100}%` }} />
                    </div>
                    {!goal.achieved && <p className="text-xs text-muted-foreground mt-1">{motivationalMessage(currentPts, goal.target_points)}</p>}
                    {isOwner && (
                      <div className="flex gap-3 mt-2">
                        <button onClick={() => markAchieved(goal)} className="text-[11px] text-emerald-600 hover:underline">{goal.achieved ? "Unmark achieved" : "Mark achieved"}</button>
                        <button onClick={() => startEditGoal(goal)} className="text-[11px] text-primary hover:underline">Edit</button>
                        <button onClick={() => deleteGoal(goal.id)} className="text-[11px] text-muted-foreground hover:text-destructive">Delete</button>
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
