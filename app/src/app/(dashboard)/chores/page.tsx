"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Chore, type ChoreCompletion, type CachedMember } from "@/lib/pocketbase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; hasPin: boolean };

const CHORE_EMOJI: Record<string, string> = {
  dish: "🍽️", vacuum: "🧹", laundry: "👕", trash: "🗑️", bed: "🛏️",
  cook: "🍳", clean: "🧽", mop: "🪣", tidy: "📦", garden: "🌿",
  lawn: "🌿", wipe: "🧻", homework: "📚", teeth: "🦷", brush: "🦷",
  shower: "🚿", bath: "🛁", pet: "🐾", feed: "🐾", walk: "🐕",
  cup: "☕", table: "🪑", fish: "🐟", shoe: "👟", sock: "🧦",
};

function choreEmoji(title: string) {
  const low = title.toLowerCase();
  for (const [key, emoji] of Object.entries(CHORE_EMOJI)) {
    if (low.includes(key)) return emoji;
  }
  return "✅";
}

const CARD_COLORS = [
  { bg: "bg-sky-100", border: "border-sky-200", text: "text-sky-800" },
  { bg: "bg-violet-100", border: "border-violet-200", text: "text-violet-800" },
  { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-800" },
  { bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-800" },
  { bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-800" },
  { bg: "bg-orange-100", border: "border-orange-200", text: "text-orange-800" },
  { bg: "bg-pink-100", border: "border-pink-200", text: "text-pink-800" },
  { bg: "bg-teal-100", border: "border-teal-200", text: "text-teal-800" },
];

function choreCardColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStartStr() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ChoreFormState {
  title: string;
  type: Chore["type"];
  scope: "all" | "kids";
  assignee: string;
  recurrence: Chore["recurrence"];
  dueDate: string;
  points: number;
}

const defaultForm = (): ChoreFormState => ({
  title: "", type: "single", scope: "all", assignee: "", recurrence: "none", dueDate: "", points: 0,
});

function formFromChore(c: Chore): ChoreFormState {
  return {
    title: c.title,
    type: c.type,
    scope: c.scope ?? "all",
    assignee: c.assignee ?? "",
    recurrence: c.recurrence,
    dueDate: c.due_date ?? "",
    points: c.points ?? 0,
  };
}

export default function ChoresPage() {
  const { householdId, user } = useAuth();
  const pb = getClient();
  const today = todayStr();
  const weekStart = weekStartStr();

  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChoreFormState>(defaultForm());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    pb.collection("chores")
      .getFullList({ filter: `household="${householdId}"`, expand: "assignee", sort: "completed,due_date" })
      .then((items) => setChores(items as unknown as Chore[]));
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) =>
        setMembers(ms.map((m: any) => ({
          id: m.expand?.user?.id ?? m.user,
          name: m.expand?.user?.name ?? "Unknown",
          hasPin: Boolean(m.pin),
        })))
      );
    pb.collection("chore_completions")
      .getFullList({
        filter: `chore.household="${householdId}" && date >= "${weekStart} 00:00:00"`,
      })
      .then((items) => setCompletions(items as unknown as ChoreCompletion[]));
  }, [householdId, weekStart]);

  // Scoreboard
  const pointsByUser: Record<string, number> = {};
  for (const c of completions) {
    pointsByUser[c.user] = (pointsByUser[c.user] ?? 0) + (c.points ?? 0);
  }
  const maxPoints = Math.max(1, ...Object.values(pointsByUser));
  const scoreboard = [...members]
    .map((m) => ({ ...m, points: pointsByUser[m.id] ?? 0 }))
    .sort((a, b) => b.points - a.points);

  function setField<K extends keyof ChoreFormState>(k: K, v: ChoreFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startAdd() {
    setForm(defaultForm());
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(chore: Chore) {
    setForm(formFromChore(chore));
    setEditingId(chore.id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm());
  }

  async function saveChore() {
    if (!form.title.trim() || !householdId) return;
    setLoading(true);
    try {
      const payload = {
        household: householdId,
        title: form.title.trim(),
        type: form.type,
        scope: form.type === "everyone" ? form.scope : undefined,
        assignee: form.type !== "everyone" && form.assignee ? form.assignee : undefined,
        recurrence: form.recurrence,
        due_date: form.dueDate || undefined,
        points: form.points,
        ...(editingId ? {} : { completed: false }),
      };

      if (editingId) {
        await pb.collection("chores").update(editingId, payload);
        const full = await pb.collection("chores").getOne(editingId, { expand: "assignee" });
        setChores((prev) => prev.map((c) => c.id === editingId ? full as unknown as Chore : c));
      } else {
        const chore = await pb.collection("chores").create(payload);
        const full = await pb.collection("chores").getOne(chore.id, { expand: "assignee" });
        setChores((prev) => [...prev, full as unknown as Chore]);
      }
      cancelForm();
    } finally {
      setLoading(false);
    }
  }

  async function toggleSingle(chore: Chore) {
    if (!user) return;
    const newCompleted = !chore.completed;
    await pb.collection("chores").update(chore.id, { completed: newCompleted });
    if (newCompleted) {
      const created = await pb.collection("chore_completions").create({
        chore: chore.id, user: user.id, date: today, points: chore.points ?? 0,
      });
      setCompletions((prev) => [...prev, created as unknown as ChoreCompletion]);
    } else {
      const existing = completions.find((c) => c.chore === chore.id);
      if (existing) {
        await pb.collection("chore_completions").delete(existing.id);
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      }
    }
    setChores((prev) => prev.map((c) => c.id === chore.id ? { ...c, completed: newCompleted } : c));
  }

  async function toggleEveryoneCompletion(chore: Chore) {
    if (!user) return;
    const todayComp = completions.filter((c) => c.date.startsWith(today));
    const existing = todayComp.find((c) => c.chore === chore.id && c.user === user.id);
    if (existing) {
      await pb.collection("chore_completions").delete(existing.id);
      setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
    } else {
      const created = await pb.collection("chore_completions").create({
        chore: chore.id, user: user.id, date: today, points: chore.points ?? 0,
      });
      setCompletions((prev) => [...prev, created as unknown as ChoreCompletion]);
    }
  }

  async function deleteChore(id: string) {
    await pb.collection("chores").delete(id);
    setChores((prev) => prev.filter((c) => c.id !== id));
  }

  const todayCompletions = completions.filter((c) => c.date.startsWith(today));
  const everyoneChores = chores.filter((c) => c.type === "everyone");
  const activeChores = chores.filter((c) => c.type !== "everyone" && !c.completed);
  const doneChores = chores.filter((c) => c.type !== "everyone" && c.completed);
  const kidMembers = members.filter((m) => m.hasPin);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chores</h1>
        <Button onClick={showForm ? cancelForm : startAdd} variant={showForm ? "secondary" : "default"} size="sm">
          {showForm ? "Cancel" : "+ Add chore"}
        </Button>
      </div>

      {/* Scoreboard */}
      {scoreboard.some((m) => m.points > 0) && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
            <p className="text-sm font-bold">This week's scores</p>
          </div>
          <div className="px-4 pb-3 flex flex-col gap-2 mt-1">
            {scoreboard.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm w-20 truncate font-medium">{m.name.split(" ")[0]}</span>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${(m.points / maxPoints) * 100}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-amber-600 font-semibold w-14 text-right">
                  {m.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 flex flex-col gap-3">
            <p className="text-sm font-medium">{editingId ? "Edit chore" : "New chore"}</p>
            <div className="flex flex-col gap-1">
              <Label>Type</Label>
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value as Chore["type"])}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="single">Single complete — one person does it for everyone</option>
                <option value="everyone">Everyone complete — each person ticks their own</option>
                <option value="shared">Shared job — split between assigned members</option>
              </select>
            </div>

            {form.type === "everyone" && (
              <div className="flex flex-col gap-1">
                <Label>Who needs to do it?</Label>
                <select
                  value={form.scope}
                  onChange={(e) => setField("scope", e.target.value as "all" | "kids")}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Everyone in the household</option>
                  <option value="kids">Kids only</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label>Task</Label>
              <Input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Brush teeth"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {form.type !== "everyone" && (
                <div className="flex flex-col gap-1">
                  <Label>Assign to</Label>
                  <select
                    value={form.assignee}
                    onChange={(e) => setField("assignee", e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Anyone</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Label>Repeats</Label>
                <select
                  value={form.recurrence}
                  onChange={(e) => setField("recurrence", e.target.value as Chore["recurrence"])}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.points}
                  onChange={(e) => setField("points", Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Due date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveChore} disabled={loading || !form.title.trim()}>
                {loading ? "Saving…" : editingId ? "Save changes" : "Add chore"}
              </Button>
              <Button variant="ghost" onClick={cancelForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {chores.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
          No chores yet — tap "+ Add chore" to get started!
        </div>
      )}

      {everyoneChores.length > 0 && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 text-sm font-bold">Everyone's chores</div>
          <div className="flex flex-col divide-y divide-border">
            {everyoneChores.map((chore) => {
              const scopeMembers = chore.scope === "kids" ? kidMembers : members;
              return (
                <EveryoneRow
                  key={chore.id}
                  chore={chore}
                  userId={user?.id ?? ""}
                  completions={todayCompletions.filter((c) => c.chore === chore.id)}
                  memberCount={scopeMembers.length}
                  onToggle={toggleEveryoneCompletion}
                  onEdit={startEdit}
                  onDelete={deleteChore}
                />
              );
            })}
          </div>
        </div>
      )}

      {activeChores.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Tasks</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeChores.map((chore) => (
              <ChoreCard key={chore.id} chore={chore} done={false} onToggle={toggleSingle} onEdit={startEdit} onDelete={deleteChore} />
            ))}
          </div>
        </div>
      )}

      {doneChores.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Done</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {doneChores.map((chore) => (
              <ChoreCard key={chore.id} chore={chore} done={true} onToggle={toggleSingle} onEdit={startEdit} onDelete={deleteChore} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChoreCard({
  chore, done, onToggle, onEdit, onDelete,
}: {
  chore: Chore; done: boolean;
  onToggle: (c: Chore) => void;
  onEdit: (c: Chore) => void;
  onDelete: (id: string) => void;
}) {
  const col = choreCardColor(chore.id);
  const isOverdue = !done && chore.due_date && new Date(chore.due_date) < new Date();
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center cursor-pointer select-none transition-opacity",
        col.bg, col.border,
        done && "opacity-55"
      )}
      onClick={() => onToggle(chore)}
    >
      <span className="text-3xl leading-none mt-1">{choreEmoji(chore.title)}</span>
      <p className={cn("text-xs font-semibold leading-tight", col.text, done && "line-through")}>{chore.title}</p>
      {(chore.points ?? 0) > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
          <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
          {chore.points} pts
        </span>
      )}
      {chore.expand?.assignee && (
        <span className={cn("text-[10px] opacity-70", col.text)}>{(chore.expand.assignee as any).name.split(" ")[0]}</span>
      )}
      {isOverdue && (
        <span className="text-[10px] text-destructive font-medium">overdue</span>
      )}
      {done && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(chore); }}
        className="absolute bottom-2 right-2 text-[10px] opacity-40 hover:opacity-80"
        title="Edit"
      >✎</button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(chore.id); }}
        className="absolute top-2 left-2 text-[10px] opacity-30 hover:opacity-70 hover:text-destructive"
        title="Delete"
      >✕</button>
    </div>
  );
}

function EveryoneRow({
  chore, userId, completions, memberCount, onToggle, onEdit, onDelete,
}: {
  chore: Chore; userId: string; completions: ChoreCompletion[];
  memberCount: number;
  onToggle: (c: Chore) => void;
  onEdit: (c: Chore) => void;
  onDelete: (id: string) => void;
}) {
  const myDone = completions.some((c) => c.user === userId);
  const doneCount = completions.length;
  const pct = memberCount > 0 ? (doneCount / memberCount) * 100 : 0;
  return (
    <div
      className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors", myDone && "opacity-60")}
      onClick={() => onToggle(chore)}
    >
      <span className="text-xl shrink-0">{choreEmoji(chore.title)}</span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", myDone && "line-through")}>{chore.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{doneCount}/{memberCount}</span>
        </div>
      </div>
      {chore.scope === "kids" && <Badge variant="outline" className="text-xs">kids</Badge>}
      {(chore.points ?? 0) > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-amber-600 font-semibold shrink-0">
          <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
          {chore.points}
        </span>
      )}
      {myDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(chore); }}
        className="text-muted-foreground hover:text-foreground text-xs shrink-0"
        title="Edit"
      >✎</button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(chore.id); }}
        className="text-muted-foreground hover:text-destructive text-xs shrink-0"
        title="Delete"
      >✕</button>
    </div>
  );
}
