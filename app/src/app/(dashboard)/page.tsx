"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Chore, type ChoreCompletion, type CalendarEvent, type Task, type Note, type ActivityEntry } from "@/lib/pocketbase";
import Link from "next/link";
import { CheckCircle2, Star, Square, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const CHORE_EMOJI: Record<string, string> = {
  dish: "🍽️", vacuum: "🧹", laundry: "👕", trash: "🗑️", bed: "🛏️",
  cook: "🍳", clean: "🧽", mop: "🪣", tidy: "📦", garden: "🌿",
  lawn: "🌿", wipe: "🧻", homework: "📚", teeth: "🦷", brush: "🦷",
  shower: "🚿", bath: "🛁", pet: "🐾", feed: "🐾", walk: "🐕",
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
];

function choreCardColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function greeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name}!`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
    if (!custodyWeek) return false;
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

function formatEventDate(start: string) {
  const d = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) {
    return `Today ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diff === 1) {
    return `Tomorrow ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const EVENT_BORDER_COLORS = ["border-sky-400", "border-violet-400", "border-amber-400", "border-rose-400", "border-emerald-400"];
function eventBorderColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return EVENT_BORDER_COLORS[h % EVENT_BORDER_COLORS.length];
}

function computeStreak(completions: ChoreCompletion[], uid: string): number {
  const dates = new Set(completions.filter(c => c.user === uid).map(c => c.date.slice(0, 10)));
  let s = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) s++; else break;
  }
  return s;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" className="stroke-primary transition-all duration-700" />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-black leading-none">{done}/{total}</p>
      </div>
    </div>
  );
}

function DueTasksSection({
  tasks,
  loading,
  pb,
  onToggle,
}: {
  tasks: Task[];
  loading: boolean;
  pb: ReturnType<typeof getClient>;
  onToggle: (id: string) => void;
}) {
  async function complete(t: Task) {
    await pb.collection("tasks").update(t.id, { completed: true });
    onToggle(t.id);
  }

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h2 className="font-bold text-sm">Due tasks</h2>
        </div>
        <Link href="/tasks" className="text-xs text-orange-500 font-medium hover:underline">View all</Link>
      </div>
      {loading ? (
        <div className="px-4 pb-3 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((t) => {
            const today = new Date().toISOString().substring(0, 10);
            const overdue = t.due_date && t.due_date < today;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <button onClick={() => complete(t)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  <Square className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.notes && <p className="text-xs text-muted-foreground truncate">{t.notes}</p>}
                </div>
                {overdue && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">Overdue</span>
                )}
                {t.due_date === today && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">Today</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const NOTE_BG: Record<string, string> = {
  "bg-yellow-100":  "bg-yellow-100 border-yellow-200",
  "bg-pink-100":    "bg-pink-100 border-pink-200",
  "bg-sky-100":     "bg-sky-100 border-sky-200",
  "bg-emerald-100": "bg-emerald-100 border-emerald-200",
  "bg-violet-100":  "bg-violet-100 border-violet-200",
  "bg-orange-100":  "bg-orange-100 border-orange-200",
};

export default function DashboardPage() {
  const { user, membership, householdId } = useAuth();
  const pb = getClient();

  const [todayChores, setTodayChores] = useState<Chore[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [weekPoints, setWeekPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [dueTasks, setDueTasks] = useState<Task[]>([]);
  const [streaks, setStreaks] = useState<{ name: string; streak: number; weekPts: number }[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = (user?.name as string)?.split(" ")[0] ?? "there";
  const householdName = membership?.expand?.household?.name ?? "";

  useEffect(() => {
    if (!householdId || !user) return;

    async function load() {
      const today = todayStr();

      const now = new Date();
      const storedWeekStart = typeof window !== "undefined" ? localStorage.getItem("planner_week_start") : null;
      const startOnSun = storedWeekStart === "sun";
      const dayOfWeek = startOnSun ? now.getDay() : (now.getDay() + 6) % 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const thirtyAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

      const [chores, myWeekCompletions, allMyCompletions, events, tasks, allCompletions, allMemberships, recentActivity, pinnedNotes] = await Promise.all([
        pb.collection("chores").getFullList<Chore>({
          filter: `household="${householdId}"`,
          expand: "assignee",
        }),
        pb.collection("chore_completions").getFullList<ChoreCompletion>({
          filter: `user="${user!.id}" && date >= "${weekStartStr}"`,
        }),
        pb.collection("chore_completions").getFullList<ChoreCompletion>({
          filter: `user="${user!.id}"`,
        }),
        pb.collection("calendar_events").getFullList<CalendarEvent>({
          filter: `household="${householdId}" && start >= "${today}"`,
          sort: "start",
        }),
        pb.collection("tasks").getFullList<Task>({
          filter: `household="${householdId}" && due_date <= "${today}" && completed = false`,
          sort: "due_date",
        }).catch(() => [] as Task[]),
        pb.collection("chore_completions").getFullList<ChoreCompletion>({
          filter: `chore.household="${householdId}" && date >= "${thirtyAgoStr}"`,
          sort: "-date",
        }).catch(() => [] as ChoreCompletion[]),
        pb.collection("memberships").getFullList({
          filter: `household="${householdId}"`,
          expand: "user",
        }).catch(() => []),
        pb.collection("activity_log").getFullList<ActivityEntry>({
          filter: `household="${householdId}"`,
          sort: "-created",
          expand: "user",
        }).catch(() => [] as ActivityEntry[]),
        pb.collection("notes").getFullList<Note>({
          filter: `household="${householdId}"`,
          sort: "-created",
        }).catch(() => [] as Note[]),
      ]);

      const custodyWeek = (membership?.expand?.household?.custody_week ?? "") as "odd" | "even" | "";
      const due = chores.filter((c) => isDueOnDate(c, today, custodyWeek)).slice(0, 5);

      const wPts = myWeekCompletions.reduce((s, c) => s + (c.points ?? 0), 0);
      const allPts = allMyCompletions.reduce((s, c) => s + (c.points ?? 0), 0);

      const visibleTasks = tasks.filter((t) => {
        if (membership?.role === "owner") return true;
        if (!t.assigned_to) return true;
        return t.assigned_to === user!.id || t.created_by === user!.id;
      });

      const memberStreaks = (allMemberships as any[]).map((m) => {
        const uid = m.expand?.user?.id ?? m.user;
        const name = (m.expand?.user?.name as string ?? "").split(" ")[0];
        const weekPts = allCompletions.filter(c => c.user === uid && c.date >= weekStartStr).reduce((s, c) => s + (c.points ?? 0), 0);
        return { name, streak: computeStreak(allCompletions, uid), weekPts };
      }).filter(m => m.streak > 0).sort((a, b) => b.streak - a.streak || b.weekPts - a.weekPts);

      setTodayChores(due);
      setCompletions(myWeekCompletions);
      setWeeklyCompleted(myWeekCompletions.length);
      setWeekPoints(wPts);
      setTotalPoints(allPts);
      setUpcomingEvents(events.slice(0, 4));
      setDueTasks(visibleTasks);
      setStreaks(memberStreaks);
      setActivity(recentActivity.slice(0, 10));
      setNotes(pinnedNotes.filter((n) => n.pinned));
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [householdId, user]);

  const _today = todayStr();
  const todayCompletions = completions.filter(
    (c) => c.date === _today || c.date.startsWith(_today + " ") || c.date.startsWith(_today + "T"),
  );
  const completedChoreIds = new Set(todayCompletions.map((c) => c.chore));
  const todayDoneCount = todayChores.filter((c) => completedChoreIds.has(c.id)).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-xl font-bold">{greeting(firstName)}</h1>
        {householdName && <p className="text-sm text-muted-foreground">{householdName}</p>}
      </div>

      {/* Stats row */}
      <div className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 flex items-center gap-4">
        <ProgressRing done={todayDoneCount} total={todayChores.length} />
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{weeklyCompleted} done this week</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-amber-500 font-medium">
            <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
            <span>{weekPoints} pts this week</span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="flex flex-col items-center gap-0.5">
            <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
            <span className="text-sm font-black">{totalPoints}</span>
            <span className="text-[10px] text-muted-foreground">total pts</span>
          </div>
          {(membership as any)?.pin && typeof (membership as any)?.balance === "number" && (
            <div className="flex flex-col items-center gap-0.5">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-black text-emerald-600">${((membership as any).balance as number).toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">balance</span>
            </div>
          )}
        </div>
      </div>

      {/* Streaks */}
      {streaks.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2"><h2 className="font-bold text-sm flex items-center gap-1">🔥 Streaks</h2></div>
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto">
            {streaks.map((s, i) => (
              <div key={s.name} className="flex flex-col items-center gap-1 shrink-0 min-w-12">
                <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔥"}</span>
                <span className="text-lg font-black">{s.streak}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {(loading || upcomingEvents.length > 0) && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <span className="text-base">📅</span>
            <h2 className="font-bold text-sm">Upcoming events</h2>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">Loading…</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">No upcoming events</div>
            ) : (
              upcomingEvents.map((ev) => (
                <div key={ev.id} className={cn("flex items-start gap-0 pl-4")}>
                  <div className={cn("w-1 self-stretch rounded-l mr-3 shrink-0", eventBorderColor(ev.id).replace("border-", "bg-"))} />
                  <div className="py-2.5 pr-4 flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatEventDate(ev.start)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 pb-3 pt-1">
            <Link href="/calendar" className="text-xs text-orange-500 font-medium hover:underline">View all</Link>
          </div>
        </div>
      )}

      {/* Due tasks */}
      {(loading || dueTasks.length > 0) && (
        <DueTasksSection tasks={dueTasks} loading={loading} pb={pb} onToggle={(id) =>
          setDueTasks((prev) => prev.filter((t) => t.id !== id))
        } />
      )}

      {/* Today's chores */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <h2 className="font-bold text-sm">Today's chores</h2>
          </div>
        </div>

        {loading ? (
          <div className="px-4 pb-3 text-sm text-muted-foreground">Loading…</div>
        ) : todayChores.length === 0 ? (
          <div className="px-4 pb-4 text-sm text-muted-foreground">All done — nothing due today! 🎉</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-3">
              {todayChores.map((chore) => {
                const done = completedChoreIds.has(chore.id);
                const colors = choreCardColor(chore.id);
                return (
                  <Link
                    key={chore.id}
                    href="/chores"
                    className={cn(
                      "relative rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center transition-opacity",
                      colors,
                      done && "opacity-60"
                    )}
                  >
                    <span className="text-3xl leading-none">{choreEmoji(chore.title)}</span>
                    <p className={cn("text-xs font-medium leading-tight", done && "line-through")}>{chore.title}</p>
                    {chore.points > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                        <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                        {chore.points} pts
                      </span>
                    )}
                    {done && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="px-4 pb-3">
              <Link href="/chores" className="text-xs text-orange-500 font-medium hover:underline">View all</Link>
            </div>
          </>
        )}
      </div>

      {/* Pinned notes */}
      {notes.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h2 className="font-bold text-sm">📝 Pinned notes</h2>
            <Link href="/notes" className="text-xs text-orange-500 font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 pb-3">
            {notes.map((note) => {
              const cls = NOTE_BG[note.color ?? ""] ?? "bg-yellow-100 border-yellow-200";
              return (
                <div key={note.id} className={cn("rounded-xl border p-2.5 text-xs", cls)}>
                  <p className="line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity feed */}
      {activity.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h2 className="font-bold text-sm">📜 Recent activity</h2>
          </div>
          <div className="divide-y divide-border">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(a.created).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
