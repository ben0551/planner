"use client";

import { useEffect, useState } from "react";
import { useAuth, usePermission } from "@/context/auth";
import { getClient, type Chore, type ChoreCompletion } from "@/lib/pocketbase";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle2, Plus, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
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
  "bg-sky-100 border-sky-200",
  "bg-violet-100 border-violet-200",
  "bg-amber-100 border-amber-200",
  "bg-rose-100 border-rose-200",
  "bg-emerald-100 border-emerald-200",
  "bg-orange-100 border-orange-200",
  "bg-pink-100 border-pink-200",
  "bg-teal-100 border-teal-200",
];

function choreColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
}

function isDueOnDate(chore: Chore, dateStr: string, custodyWeek?: "odd" | "even" | ""): boolean {
  if (chore.recurrence === "daily") return true;
  if (chore.recurrence === "weekly") {
    if (!chore.due_date) return true;
    return new Date(dateStr + "T12:00:00").getDay() === new Date(chore.due_date + "T12:00:00").getDay();
  }
  if (chore.recurrence === "odd_week") return isoWeekNumber(new Date(dateStr)) % 2 === 1;
  if (chore.recurrence === "even_week") return isoWeekNumber(new Date(dateStr)) % 2 === 0;
  if (chore.recurrence === "my_week") {
    if (!custodyWeek) return false; // no custody schedule set
    const weekNum = isoWeekNumber(new Date(dateStr));
    return custodyWeek === "odd" ? weekNum % 2 === 1 : weekNum % 2 === 0;
  }
  if (chore.recurrence === "fortnightly") {
    if (!chore.due_date) return true;
    const ref = new Date(chore.due_date);
    const target = new Date(dateStr);
    const diffWeeks = Math.round((target.getTime() - ref.getTime()) / (7 * 86400000));
    return diffWeeks % 2 === 0;
  }
  if (chore.recurrence === "monthly") {
    if (!chore.due_date) return true;
    return new Date(chore.due_date).getDate() === new Date(dateStr).getDate();
  }
  return chore.due_date ? chore.due_date.startsWith(dateStr) : false;
}

function formatDeadline(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function isPastDeadline(deadlineTime: string, dateStr: string): boolean {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (dateStr !== todayStr) return false;
  const [h, m] = deadlineTime.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h, m, 0, 0);
  return now > deadline;
}

interface ChoreFormState {
  title: string;
  type: Chore["type"];
  scope: "all" | "kids";
  assignee: string;
  recurrence: Chore["recurrence"];
  dueDate: string;
  weekDay: string;
  points: number;
  deadlineTime: string;
}

const defaultForm = (): ChoreFormState => ({
  title: "", type: "single", scope: "all", assignee: "",
  recurrence: "daily", dueDate: "", weekDay: "", points: 1, deadlineTime: "",
});

function nearestPastWeekday(day: number): string {
  const d = new Date();
  const diff = (d.getDay() - day + 7) % 7;
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formFromChore(c: Chore): ChoreFormState {
  const isKidsOnly = c.type !== "everyone" && c.scope === "kids" && !c.assignee;
  return {
    title: c.title, type: c.type, scope: c.scope ?? "all",
    assignee: isKidsOnly ? "__kids__" : (c.assignee ?? ""),
    recurrence: c.recurrence,
    dueDate: c.due_date ?? "",
    weekDay: (c.recurrence === "weekly" && c.due_date)
      ? String(new Date(c.due_date + "T12:00:00").getDay())
      : "",
    points: c.points ?? 1,
    deadlineTime: c.deadline_time ?? "",
  };
}

export default function ChoresPage() {
  const { householdId, user, membership } = useAuth();
  const custodyWeek = membership?.expand?.household?.custody_week as "odd" | "even" | "" | undefined;
  const pb = getClient();
  const isOwner = membership?.role === "owner";
  const chorePerm = usePermission("chores");

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);

  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChoreFormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [adminDay, setAdminDay] = useState(() => toDateStr(new Date()));

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = toDateStr(new Date());

  useEffect(() => {
    if (!householdId) return;
    const from = toDateStr(weekStart);
    const to = toDateStr(addDays(weekStart, 6));
    pb.collection("chores")
      .getFullList({ filter: `household="${householdId}"`, expand: "assignee" })
      .then((items) => setChores(items as unknown as Chore[]));
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) => setMembers(ms.map((m: any) => ({
        id: m.expand?.user?.id ?? m.user,
        name: m.expand?.user?.name ?? "Unknown",
        hasPin: Boolean(m.pin),
      }))));
    pb.collection("chore_completions")
      .getFullList({ filter: `chore.household="${householdId}" && date >= "${from}" && date <= "${to} 23:59:59"` })
      .then((items) => setCompletions(items as unknown as ChoreCompletion[]));
  }, [householdId, weekStart]);

  function isCompletedOnDate(chore: Chore, dateStr: string): boolean {
    if (chore.type === "everyone") {
      return completions.some(c => c.chore === chore.id && c.user === (user?.id ?? "") && c.date.startsWith(dateStr));
    }
    return completions.some(c => c.chore === chore.id && c.date.startsWith(dateStr));
  }

  async function toggleForKid(chore: Chore, dateStr: string, kidId: string) {
    const existing = completions.find(c =>
      c.chore === chore.id && c.date.startsWith(dateStr) && c.user === kidId
    );
    if (existing) {
      await pb.collection("chore_completions").delete(existing.id);
      setCompletions(prev => prev.filter(c => c.id !== existing.id));
    } else {
      const created = await pb.collection("chore_completions").create({
        chore: chore.id, user: kidId, date: dateStr, points: chore.points ?? 0,
      });
      setCompletions(prev => [...prev, created as unknown as ChoreCompletion]);
      logActivity(householdId!, kidId, `✅ ${chore.title} completed`, "chore", chore.id);
    }
  }

  async function toggleOnDate(chore: Chore, dateStr: string) {
    if (!user) return;
    if (dateStr > todayStr) return;
    if (!isOwner && chore.assignee && chore.assignee !== user.id) return;
    const existing = completions.find(c =>
      c.chore === chore.id &&
      c.date.startsWith(dateStr) &&
      (chore.type !== "everyone" || c.user === user.id)
    );
    if (existing) {
      await pb.collection("chore_completions").delete(existing.id);
      setCompletions(prev => prev.filter(c => c.id !== existing.id));
    } else {
      const late = chore.deadline_time ? isPastDeadline(chore.deadline_time, dateStr) : false;
      const created = await pb.collection("chore_completions").create({
        chore: chore.id, user: user.id, date: dateStr, points: late ? 0 : (chore.points ?? 0),
      });
      setCompletions(prev => [...prev, created as unknown as ChoreCompletion]);
      logActivity(householdId!, user.id, `✅ ${chore.title} completed`, "chore", chore.id);
    }
  }

  async function deleteChore(id: string) {
    await pb.collection("chores").delete(id);
    setChores(prev => prev.filter(c => c.id !== id));
  }

  function setField<K extends keyof ChoreFormState>(k: K, v: ChoreFormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function startEdit(chore: Chore) {
    setForm(formFromChore(chore));
    setEditingId(chore.id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false); setEditingId(null); setForm(defaultForm());
  }

  async function saveChore() {
    if (!form.title.trim() || !householdId) return;
    setSaving(true);
    try {
      const isKidsOnly = form.type !== "everyone" && form.assignee === "__kids__";
      const payload: Record<string, unknown> = {
        household: householdId,
        title: form.title.trim(),
        type: form.type,
        recurrence: form.recurrence,
        points: form.points,
        scope: form.type === "everyone" ? form.scope : isKidsOnly ? "kids" : "all",
        assignee: (form.type !== "everyone" && form.assignee && !isKidsOnly) ? form.assignee : null,
      };
      if (form.recurrence === "none" && form.dueDate) payload.due_date = form.dueDate;
      else if (form.recurrence === "weekly" && form.weekDay !== "") payload.due_date = nearestPastWeekday(parseInt(form.weekDay));
      else if (form.recurrence !== "none") payload.due_date = null;
      if (form.deadlineTime) payload.deadline_time = form.deadlineTime;
      else payload.deadline_time = null;
      if (editingId) {
        await pb.collection("chores").update(editingId, payload);
        const full = await pb.collection("chores").getOne(editingId, { expand: "assignee" });
        setChores(prev => prev.map(c => c.id === editingId ? full as unknown as Chore : c));
      } else {
        const chore = await pb.collection("chores").create(payload);
        const full = await pb.collection("chores").getOne(chore.id, { expand: "assignee" });
        setChores(prev => [...prev, full as unknown as Chore]);
      }
      cancelForm();
    } finally {
      setSaving(false);
    }
  }

  // Scoreboard
  const pointsByUser: Record<string, number> = {};
  for (const c of completions) {
    pointsByUser[c.user] = (pointsByUser[c.user] ?? 0) + (c.points ?? 0);
  }
  const scoreboard = [...members]
    .map(m => ({ ...m, points: pointsByUser[m.id] ?? 0 }))
    .sort((a, b) => b.points - a.points);
  const maxPoints = Math.max(1, ...scoreboard.map(s => s.points));

  const kidMembers = members.filter(m => m.hasPin);
  const isKidUser = members.find(m => m.id === user?.id)?.hasPin ?? false;

  const activeChores = chores.filter(c => {
    if (c.recurrence === "none" && c.due_date && c.due_date < toDateStr(weekStart)) return false;
    if (!isOwner && c.assignee && c.assignee !== user?.id) return false;
    // hide kids-only single/shared chores from non-kid adults
    if (!isOwner && !isKidUser && c.scope === "kids" && c.type !== "everyone") return false;
    return true;
  });

  const weekLabel = `${weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en", { month: "short", day: "numeric" })}`;

  function ChoreCard({
    chore, dateStr, compact = false,
  }: {
    chore: Chore; dateStr: string; compact?: boolean;
  }) {
    const done = isCompletedOnDate(chore, dateStr);
    const isFuture = dateStr > todayStr;
    const isOtherKid = !isOwner && chore.assignee && chore.assignee !== user?.id;
    const col = choreColor(chore.id);
    const scopeMembers = chore.scope === "kids" ? kidMembers : members;
    const totalDone = chore.type === "everyone"
      ? completions.filter(c => c.chore === chore.id && c.date.startsWith(dateStr)).length
      : 0;

    return (
      <div
        onClick={() => toggleOnDate(chore, dateStr)}
        className={cn(
          "relative rounded-2xl border flex flex-col items-center text-center select-none transition-all",
          compact ? "p-2 gap-1" : "p-3 gap-1.5",
          isFuture || isOtherKid
            ? "opacity-30 cursor-default " + col
            : done
              ? "cursor-pointer active:scale-95 bg-emerald-50 border-emerald-300"
              : "cursor-pointer hover:shadow-sm active:scale-95 " + col,
        )}
      >
        {isOwner && !isFuture && (
          <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => startEdit(chore)}
              className="text-[9px] text-muted-foreground hover:text-foreground bg-white/60 rounded px-1 py-0.5">✎</button>
            <button onClick={() => deleteChore(chore.id)}
              className="text-[9px] text-muted-foreground hover:text-destructive bg-white/60 rounded px-1 py-0.5">✕</button>
          </div>
        )}
        <span className={cn("leading-none", compact ? "text-2xl mt-0.5" : "text-4xl mt-1")}>
          {done ? "✅" : choreEmoji(chore.title)}
        </span>
        <p className={cn("font-black leading-tight", compact ? "text-[10px]" : "text-xs", done && "line-through text-emerald-700")}>
          {chore.title}
        </p>
        {!done && (chore.points ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-black">
            <Star className={cn("fill-amber-400 stroke-amber-400", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
            {chore.points} pts
          </span>
        )}
        {chore.deadline_time && !done && (
          <span className="text-[9px] text-rose-600 font-bold">⏰ by {formatDeadline(chore.deadline_time)}</span>
        )}
        {chore.type === "everyone" && (
          <span className="text-[9px] text-muted-foreground">{totalDone}/{scopeMembers.length}</span>
        )}
        {done && (
          <span className="text-[9px] text-emerald-600 font-bold">tap to undo</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-black">Chores</h1>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => { setAdminView(v => !v); cancelForm(); }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-bold transition-colors",
                adminView
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {adminView ? "← Back" : "Admin"}
            </button>
            {!adminView && (
              <button
                onClick={() => showForm ? cancelForm() : setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Add chore
              </button>
            )}
          </div>
        )}
      </div>

      {/* Admin view */}
      {adminView && isOwner && (() => {
        const adminDayChores = activeChores.filter(c => isDueOnDate(c, adminDay, custodyWeek));
        return (
          <div className="flex flex-col gap-3">
            {/* Day tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {weekDates.map((date, i) => {
                const ds = toDateStr(date);
                const isToday = ds === todayStr;
                return (
                  <button
                    key={i}
                    onClick={() => setAdminDay(ds)}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                      adminDay === ds
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{DAY_NAMES[i]}</span>
                    <span className="text-[10px] font-normal">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {adminDayChores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No chores on this day.</p>
            ) : (
              <div className="rounded-2xl bg-white border border-border overflow-hidden divide-y">
                {adminDayChores.map(chore => {
                  const scopeKids = chore.type === "everyone"
                    ? (chore.scope === "kids" ? kidMembers : members)
                    : chore.assignee
                      ? members.filter(m => m.id === chore.assignee)
                      : kidMembers;
                  return (
                    <div key={chore.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-xl shrink-0">{choreEmoji(chore.title)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{chore.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {chore.type === "everyone" ? "everyone" : chore.assignee ? (members.find(m => m.id === chore.assignee)?.name ?? "?") : chore.scope === "kids" ? "kids only" : "anyone"}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {scopeKids.map(kid => {
                          const kidDone = completions.some(c =>
                            c.chore === chore.id && c.date.startsWith(adminDay) && c.user === kid.id
                          );
                          return (
                            <button
                              key={kid.id}
                              onClick={() => toggleForKid(chore, adminDay, kid.id)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors",
                                kidDone
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                  : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                              )}
                            >
                              <span>{kidDone ? "✓" : "○"}</span>
                              <span>{kid.name.split(" ")[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Scoreboard */}
      {!adminView && scoreboard.some(m => m.points > 0) && (
        <div className="rounded-3xl overflow-hidden shadow-sm border border-border bg-white">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-black">This week</span>
          </div>
          <div className="px-4 pb-3 flex flex-col gap-2 mt-1">
            {scoreboard.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-base w-6 shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""}</span>
                <span className="text-sm font-bold w-20 truncate">{m.name.split(" ")[0]}</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(m.points / maxPoints) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-amber-600 w-14 text-right">{m.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {!adminView && showForm && (
        <div className="rounded-3xl bg-white border border-border shadow-sm p-4 flex flex-col gap-3">
          <p className="font-black text-sm">{editingId ? "Edit chore" : "New chore"}</p>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Task name</Label>
            <Input value={form.title} onChange={e => setField("title", e.target.value)} placeholder="e.g. Brush teeth" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Type</Label>
              <select value={form.type} onChange={e => setField("type", e.target.value as Chore["type"])}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium">
                <option value="single">One person does it</option>
                <option value="everyone">Everyone does it</option>
                <option value="shared">Shared job</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Repeats</Label>
              <select value={form.recurrence} onChange={e => setField("recurrence", e.target.value as Chore["recurrence"])}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium">
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                {custodyWeek && (
                  <option value="my_week">My week 🏠 ({custodyWeek === "odd" ? "odd" : "even"} weeks)</option>
                )}
                <option value="odd_week">Odd weeks (1, 3, 5…)</option>
                <option value="even_week">Even weeks (2, 4, 6…)</option>
                <option value="monthly">Monthly</option>
                <option value="none">Just once</option>
              </select>
            </div>
          </div>

          {form.type === "everyone" && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Who needs to do it?</Label>
              <select value={form.scope} onChange={e => setField("scope", e.target.value as "all" | "kids")}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium">
                <option value="all">Everyone</option>
                <option value="kids">Kids only</option>
              </select>
            </div>
          )}

          {form.type !== "everyone" && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Assign to</Label>
              <select value={form.assignee} onChange={e => setField("assignee", e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium">
                <option value="">Anyone</option>
                <option value="__kids__">Kids only</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Points ⭐</Label>
              <Input type="number" min={0} value={form.points}
                onChange={e => setField("points", Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            {form.recurrence === "none" && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Due date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setField("dueDate", e.target.value)} />
              </div>
            )}
            {form.recurrence === "weekly" && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Which day?</Label>
                <select value={form.weekDay} onChange={e => setField("weekDay", e.target.value)}
                  className="h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium">
                  <option value="">Every day</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="0">Sunday</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Must complete by (optional) ⏰</Label>
            <Input type="time" value={form.deadlineTime}
              onChange={e => setField("deadlineTime", e.target.value)} className="w-36" />
            <p className="text-[11px] text-muted-foreground">No points awarded if completed after this time.</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveChore} disabled={saving || !form.title.trim()} className="rounded-xl font-bold">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add chore"}
            </Button>
            <Button variant="ghost" onClick={cancelForm} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {!adminView && chores.length === 0 && !showForm && (
        <div className="rounded-3xl border border-dashed border-muted-foreground/30 p-10 text-center text-muted-foreground text-sm">
          {isOwner ? "No chores yet — add one above! 🎉" : "No chores set yet."}
        </div>
      )}

      {!adminView && chores.length > 0 && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-bold text-muted-foreground">{weekLabel}</span>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* ── Desktop: day-column card grid ── */}
          <div className="hidden md:grid gap-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDates.map((date, i) => {
              const ds = toDateStr(date);
              const isToday = ds === todayStr;
              const dueChores = activeChores.filter(c => isDueOnDate(c, ds, custodyWeek));
              const doneCount = dueChores.filter(c => isCompletedOnDate(c, ds)).length;
              const allDone = dueChores.length > 0 && doneCount === dueChores.length;

              return (
                <div key={ds} className="flex flex-col gap-1.5 group">
                  {/* Day header */}
                  <div className={cn(
                    "rounded-2xl p-2 text-center",
                    isToday ? "bg-primary text-primary-foreground" : "bg-white border border-border"
                  )}>
                    <p className={cn("text-[10px] font-black uppercase tracking-wide",
                      isToday ? "text-primary-foreground/70" : "text-muted-foreground")}>{DAY_NAMES[i]}</p>
                    <p className="text-lg font-black leading-tight">{date.getDate()}</p>
                    {dueChores.length > 0 ? (
                      allDone
                        ? <p className="text-[9px] font-bold text-emerald-400">✓ All done!</p>
                        : <p className={cn("text-[9px] font-bold",
                            isToday ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {doneCount}/{dueChores.length}
                          </p>
                    ) : (
                      <p className={cn("text-[9px]",
                        isToday ? "text-primary-foreground/40" : "text-muted-foreground/40")}>—</p>
                    )}
                  </div>

                  {/* Chore cards */}
                  {dueChores.map(chore => (
                    <ChoreCard key={chore.id} chore={chore} dateStr={ds} compact />
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── Mobile: day tabs + card grid ── */}
          <div className="md:hidden flex flex-col gap-3">
            {/* Day selector strip */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {weekDates.map((date, i) => {
                const ds = toDateStr(date);
                const isToday = ds === todayStr;
                const selected = i === selectedDay;
                const dueChores = activeChores.filter(c => isDueOnDate(c, ds, custodyWeek));
                const doneCount = dueChores.filter(c => isCompletedOnDate(c, ds)).length;
                return (
                  <button key={ds} onClick={() => setSelectedDay(i)}
                    className={cn(
                      "flex flex-col items-center px-3 py-2 rounded-2xl shrink-0 transition-all font-bold",
                      selected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isToday
                          ? "bg-primary/10 text-primary"
                          : "bg-white border border-border text-muted-foreground"
                    )}>
                    <span className="text-[10px]">{DAY_NAMES[i]}</span>
                    <span className="text-lg leading-tight">{date.getDate()}</span>
                    {dueChores.length > 0 && (
                      <span className={cn("text-[9px] mt-0.5",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {doneCount}/{dueChores.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chore cards for selected day */}
            {(() => {
              const ds = toDateStr(weekDates[selectedDay]);
              const dueToday = activeChores.filter(c => isDueOnDate(c, ds, custodyWeek));
              if (dueToday.length === 0) {
                return (
                  <div className="rounded-3xl border border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
                    No chores today 🎉
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 gap-3">
                  {dueToday.map(chore => (
                    <ChoreCard key={chore.id} chore={chore} dateStr={ds} />
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
