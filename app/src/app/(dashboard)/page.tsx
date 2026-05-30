"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Chore, type ChoreCompletion, type CalendarEvent, type Task, type Note, type Bookmark } from "@/lib/pocketbase";
import Link from "next/link";
import { CheckCircle2, Star, Wallet, ChevronUp, ChevronDown, Settings2, ExternalLink, Plus, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";
import { getLevel } from "@/lib/levels";
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

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function agendaEventTime(ev: CalendarEvent): string | null {
  if (ev.all_day) return null;
  const part = ev.start.includes("T") ? ev.start.split("T")[1] : ev.start.split(" ")[1];
  if (!part || part.startsWith("00:00") || part.startsWith("23:59")) return null;
  const [h, m] = part.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const fmt = (hh: number, mm: number) =>
    `${hh % 12 || 12}:${String(mm).padStart(2, "0")}${hh >= 12 ? "pm" : "am"}`;
  const t1 = fmt(h, m);
  if (!ev.end) return t1;
  const endPart = ev.end.includes("T") ? ev.end.split("T")[1] : ev.end.split(" ")[1];
  if (!endPart || endPart.startsWith("23:59")) return t1;
  const [eh, em] = endPart.split(":").map(Number);
  return isNaN(eh) || isNaN(em) ? t1 : `${t1}–${fmt(eh, em)}`;
}

function isoWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7);
}

function isDueOnDate(chore: Chore, dateStr: string, custodyWeek?: "odd" | "even" | "", startOnSun?: boolean): boolean {
  const dow = new Date(dateStr + "T12:00:00").getDay();
  const weekCalcDate = (() => {
    const d = new Date(dateStr + "T12:00:00");
    if (startOnSun && d.getDay() === 0) { const s = new Date(d); s.setDate(s.getDate() + 1); return s; }
    return d;
  })();
  const allowedDays = chore.days ? chore.days.split(",").map(Number).filter(n => !isNaN(n)) : [];
  const dayAllowed = allowedDays.length === 0 || allowedDays.includes(dow);
  if (chore.recurrence === "daily") return dayAllowed;
  if (chore.recurrence === "weekly") {
    if (!chore.due_date) return dayAllowed;
    return dow === new Date(chore.due_date + "T12:00:00").getDay();
  }
  if (chore.recurrence === "odd_week") return isoWeekNumber(weekCalcDate) % 2 === 1 && dayAllowed;
  if (chore.recurrence === "even_week") return isoWeekNumber(weekCalcDate) % 2 === 0 && dayAllowed;
  if (chore.recurrence === "my_week") {
    if (!custodyWeek) return false;
    const weekNum = isoWeekNumber(weekCalcDate);
    return (custodyWeek === "odd" ? weekNum % 2 === 1 : weekNum % 2 === 0) && dayAllowed;
  }
  if (chore.recurrence === "fortnightly") {
    if (!chore.due_date) return dayAllowed;
    const ref = new Date(chore.due_date);
    const target = new Date(dateStr);
    const diffWeeks = Math.round((target.getTime() - ref.getTime()) / (7 * 86400000));
    return diffWeeks % 2 === 0 && dayAllowed;
  }
  if (chore.recurrence === "monthly") {
    if (!chore.due_date) return true;
    return new Date(chore.due_date).getDate() === new Date(dateStr).getDate();
  }
  return chore.due_date ? chore.due_date.startsWith(dateStr) : false;
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

const NOTE_BG: Record<string, string> = {
  "bg-yellow-100":  "bg-yellow-100 border-yellow-200",
  "bg-pink-100":    "bg-pink-100 border-pink-200",
  "bg-sky-100":     "bg-sky-100 border-sky-200",
  "bg-emerald-100": "bg-emerald-100 border-emerald-200",
  "bg-violet-100":  "bg-violet-100 border-violet-200",
  "bg-orange-100":  "bg-orange-100 border-orange-200",
};

type WidgetId = "streaks" | "upcoming" | "chores" | "notes" | "bookmarks";
const DEFAULT_WIDGET_ORDER: WidgetId[] = ["bookmarks", "streaks", "upcoming", "chores", "notes"];

export default function DashboardPage() {
  const { user, membership, householdId } = useAuth();
  const pb = getClient();

  const [todayChores, setTodayChores] = useState<Chore[]>([]);
  const [todayDone, setTodayDone] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);
  const [weekPoints, setWeekPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [streaks, setStreaks] = useState<{ name: string; streak: number; weekPts: number }[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [editOrder, setEditOrder] = useState(false);

  // Bookmark editing state
  const [bmForm, setBmForm] = useState<{ id?: string; name: string; url: string; emoji: string; description: string; visibility: "all" | "me" } | null>(null);
  const [bmSaving, setBmSaving] = useState(false);
  const [bmReveal, setBmReveal] = useState<Set<string>>(new Set());

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

      const [chores, myWeekCompletions, allMyCompletions, events, tasks, allCompletions, allMemberships, pinnedNotes] = await Promise.all([
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
          filter: `household="${householdId}" && completed = false`,
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
        pb.collection("notes").getFullList<Note>({
          filter: `household="${householdId}"`,
        }).catch(() => [] as Note[]),
      ]);

      const custodyWeek = (membership?.expand?.household?.custody_week ?? "") as "odd" | "even" | "";

      const todayAllCompletions = allCompletions.filter(
        (c) => c.date === today || c.date.startsWith(today + " ") || c.date.startsWith(today + "T"),
      );
      function isDoneForUser(chore: Chore): boolean {
        if (chore.type === "everyone") return todayAllCompletions.some(c => c.chore === chore.id && c.user === user!.id);
        return todayAllCompletions.some(c => c.chore === chore.id);
      }
      const allDueToday = chores.filter((c) => isDueOnDate(c, today, custodyWeek, startOnSun));
      const due = allDueToday.filter((c) => !isDoneForUser(c)).slice(0, 5);

      const wPts = myWeekCompletions.reduce((s, c) => s + (c.points ?? 0), 0);
      const allPts = allMyCompletions.reduce((s, c) => s + (c.points ?? 0), 0);

      function isTaskVisible(t: Task) {
        if (membership?.role === "owner") return true;
        if (!t.assigned_to) return true;
        return t.assigned_to === user!.id || t.created_by === user!.id;
      }
      const visibleTasks = tasks.filter(isTaskVisible);

      const memberStreaks = (allMemberships as any[]).map((m) => {
        const uid = m.expand?.user?.id ?? m.user;
        const name = (m.expand?.user?.name as string ?? "").split(" ")[0];
        const weekPts = allCompletions.filter(c => c.user === uid && c.date >= weekStartStr).reduce((s, c) => s + (c.points ?? 0), 0);
        return { name, streak: computeStreak(allCompletions, uid), weekPts };
      }).filter(m => m.streak > 0).sort((a, b) => b.streak - a.streak || b.weekPts - a.weekPts);

      setTodayChores(due);
      setTodayDone(allDueToday.filter(isDoneForUser).length);
      setTodayTotal(allDueToday.length);
      setWeeklyCompleted(myWeekCompletions.length);
      setWeekPoints(wPts);
      setTotalPoints(allPts);
      setUpcomingEvents(events);
      setAllTasks(visibleTasks);
      setStreaks(memberStreaks);
      setNotes(pinnedNotes.filter((n) => n.pinned).sort((a, b) => (b.created ?? b.id ?? "").localeCompare(a.created ?? a.id ?? "")));

      const bms = await pb.collection("bookmarks").getFullList({ filter: `household="${householdId}"`, sort: "created" });
      setBookmarks(bms as unknown as Bookmark[]);

      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [householdId, user]);

  useEffect(() => {
    if (!membership?.id) return;
    const saved = localStorage.getItem(`planner_today_order_${membership.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetId[];
        const validIds = new Set(DEFAULT_WIDGET_ORDER);
        const filtered = parsed.filter((id) => validIds.has(id));
        const missing = DEFAULT_WIDGET_ORDER.filter((id) => !filtered.includes(id));
        if (filtered.length > 0) setWidgetOrder([...filtered, ...missing]);
      } catch { /* ignore bad json */ }
    }
  }, [membership?.id]);

  function moveWidget(index: number, dir: -1 | 1) {
    const next = [...widgetOrder];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setWidgetOrder(next);
    if (membership?.id) {
      localStorage.setItem(`planner_today_order_${membership.id}`, JSON.stringify(next));
    }
  }

  async function completeTask(id: string) {
    await pb.collection("tasks").update(id, { completed: true });
    setAllTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function saveBookmark() {
    if (!bmForm || !householdId || !bmForm.name.trim() || !bmForm.url.trim()) return;
    setBmSaving(true);
    try {
      const payload = {
        household: householdId,
        name: bmForm.name.trim(),
        url: bmForm.url.trim(),
        emoji: bmForm.emoji.trim() || "🔖",
        description: bmForm.description.trim(),
        visibility: bmForm.visibility,
        created_by: bmForm.visibility === "me" ? (user?.id ?? "") : "",
      };
      if (bmForm.id) {
        const updated = await pb.collection("bookmarks").update(bmForm.id, payload);
        setBookmarks((prev) => prev.map((b) => b.id === bmForm.id ? updated as unknown as Bookmark : b));
      } else {
        const created = await pb.collection("bookmarks").create(payload);
        setBookmarks((prev) => [...prev, created as unknown as Bookmark]);
      }
      setBmForm(null);
    } finally {
      setBmSaving(false);
    }
  }

  async function deleteBookmark(id: string) {
    await pb.collection("bookmarks").delete(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  const visibleBookmarks = bookmarks.filter(
    (b) => b.visibility !== "me" || b.created_by === user?.id
  );

  const _today = todayStr();
  const overdueTasks = allTasks.filter((t) => !t.due_date || t.due_date < _today);

  type AgendaDay = { d: Date; ds: string; events: CalendarEvent[]; tasks: Task[] };
  const agendaDays: AgendaDay[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ds = toDateStr(d);
    const dayEvts = upcomingEvents.filter((e) => {
      const evDate = e.start.split("T")[0].split(" ")[0];
      return evDate === ds;
    });
    const dayTasks = allTasks.filter((t) => t.due_date === ds);
    if (dayEvts.length > 0 || dayTasks.length > 0) agendaDays.push({ d, ds, events: dayEvts, tasks: dayTasks });
  }

  function renderWidget(id: WidgetId, index: number): React.ReactNode {
    const isFirst = index === 0;
    const isLast = index === widgetOrder.length - 1;

    const moveButtons = editOrder ? (
      <div className="flex gap-0.5 ml-1.5 shrink-0">
        <button
          disabled={isFirst}
          onClick={() => moveWidget(index, -1)}
          className={cn("p-0.5 rounded transition-colors", isFirst ? "text-muted-foreground/25" : "text-muted-foreground hover:text-foreground")}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          disabled={isLast}
          onClick={() => moveWidget(index, 1)}
          className={cn("p-0.5 rounded transition-colors", isLast ? "text-muted-foreground/25" : "text-muted-foreground hover:text-foreground")}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    ) : null;

    if (id === "streaks") {
      if (!editOrder && streaks.length === 0) return null;
      return (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center">
            <h2 className="font-bold text-sm flex items-center gap-1">🔥 Streaks</h2>
            {moveButtons}
          </div>
          {streaks.length > 0 ? (
            <div className="flex gap-3 px-4 pb-3 overflow-x-auto">
              {streaks.map((s, i) => (
                <div key={s.name} className="flex flex-col items-center gap-1 shrink-0 min-w-12">
                  <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔥"}</span>
                  <span className="text-lg font-black">{s.streak}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{s.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 pb-3 text-sm text-muted-foreground">No streaks yet.</div>
          )}
        </div>
      );
    }

    if (id === "upcoming") {
      if (!editOrder && !loading && overdueTasks.length === 0 && agendaDays.length === 0) return null;
      return (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <h2 className="font-bold text-sm">Upcoming</h2>
              {moveButtons}
            </div>
            <Link href="/calendar" className="text-xs text-orange-500 font-medium hover:underline">View calendar</Link>
          </div>

          {loading ? (
            <div className="px-4 pb-3 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="flex flex-col gap-4 px-4 pb-4">
              {overdueTasks.length > 0 && (
                <div className="flex gap-3">
                  <div className="w-12 shrink-0 text-right pt-0.5">
                    <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Over</div>
                    <div className="text-xl font-black leading-tight text-red-500">due</div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5 border-l-2 border-red-200 pl-3 min-w-0">
                    {overdueTasks.map((t) => (
                      <button key={t.id} onClick={() => completeTask(t.id)}
                        className="text-left rounded-lg px-3 py-2 bg-red-50 hover:bg-red-100 transition-colors">
                        <div className="flex items-center gap-1.5 text-red-800">
                          <span className="text-xs shrink-0">○</span>
                          <span className="text-sm font-medium truncate">{t.title}</span>
                        </div>
                        {t.due_date && (
                          <div className="text-xs text-red-400 ml-4">
                            Due {new Date(t.due_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {agendaDays.map(({ d, ds, events: dayEvts, tasks: dayTasks }) => {
                const isToday = ds === _today;
                const dayName = d.toLocaleDateString("en-AU", { weekday: "short" });
                const monthName = d.toLocaleDateString("en-AU", { month: "short" });
                return (
                  <div key={ds} className="flex gap-3">
                    <div className={cn("w-12 shrink-0 text-right pt-0.5", isToday ? "text-primary" : "text-muted-foreground")}>
                      <div className="text-[10px] font-medium">{dayName}</div>
                      <div className={cn("text-xl font-black leading-tight", isToday && "text-primary")}>{d.getDate()}</div>
                      <div className="text-[10px]">{monthName}</div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 border-l-2 border-border pl-3 min-w-0">
                      {dayEvts.map((ev) => {
                        const tl = agendaEventTime(ev);
                        return (
                          <Link key={ev.id} href="/calendar"
                            className="text-left bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-2 transition-colors block">
                            <div className="text-sm font-medium leading-snug">{ev.title}</div>
                            {tl && <div className="text-xs text-primary/70">{tl}</div>}
                          </Link>
                        );
                      })}
                      {dayTasks.map((t) => (
                        <button key={t.id} onClick={() => completeTask(t.id)}
                          className="text-left rounded-lg px-3 py-2 bg-amber-50 hover:bg-amber-100 transition-colors">
                          <div className="flex items-center gap-1.5 text-amber-800">
                            <span className="text-xs shrink-0">○</span>
                            <span className="text-sm font-medium truncate">{t.title}</span>
                          </div>
                          {t.notes && <div className="text-xs text-amber-600/70 ml-4 truncate">{t.notes}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {agendaDays.length === 0 && overdueTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nothing coming up — all clear! 🎉</p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (id === "chores") {
      return (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <h2 className="font-bold text-sm">Today&apos;s chores</h2>
              {moveButtons}
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
                  const colors = choreCardColor(chore.id);
                  return (
                    <Link
                      key={chore.id}
                      href="/chores"
                      className={cn(
                        "rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center",
                        colors,
                      )}
                    >
                      <span className="text-3xl leading-none">{choreEmoji(chore.title)}</span>
                      <p className="text-xs font-medium leading-tight">{chore.title}</p>
                      {chore.points > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                          <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                          {chore.points} pts
                        </span>
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
      );
    }

    if (id === "notes") {
      if (!editOrder && notes.length === 0) return null;
      return (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <h2 className="font-bold text-sm">📝 Pinned notes</h2>
              {moveButtons}
            </div>
            <Link href="/notes" className="text-xs text-orange-500 font-medium hover:underline">View all</Link>
          </div>
          {notes.length > 0 ? (
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
          ) : (
            <div className="px-4 pb-3 text-sm text-muted-foreground">No pinned notes.</div>
          )}
        </div>
      );
    }

    if (id === "bookmarks") {
      if (!editOrder && visibleBookmarks.length === 0 && !bmForm) return null;
      return (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <h2 className="font-bold text-sm">🔖 Bookmarks</h2>
              {moveButtons}
            </div>
            <button
              onClick={() => setBmForm({ name: "", url: "", emoji: "🔖", description: "", visibility: "all" })}
              className="text-xs text-orange-500 font-medium hover:underline flex items-center gap-0.5"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {/* Add / edit form */}
          {bmForm && (
            <div className="mx-4 mb-3 p-3 rounded-xl bg-muted/40 border border-border flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={bmForm.emoji}
                  onChange={(e) => setBmForm({ ...bmForm, emoji: e.target.value })}
                  placeholder="🔖"
                  className="w-12 h-9 text-center text-xl rounded-lg border border-input bg-background"
                />
                <input
                  value={bmForm.name}
                  onChange={(e) => setBmForm({ ...bmForm, name: e.target.value })}
                  placeholder="Name"
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
                />
              </div>
              <input
                value={bmForm.url}
                onChange={(e) => setBmForm({ ...bmForm, url: e.target.value })}
                placeholder="https://…"
                type="url"
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              />
              <textarea
                value={bmForm.description}
                onChange={(e) => setBmForm({ ...bmForm, description: e.target.value })}
                placeholder="Notes / credentials (hidden by default)"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex rounded-lg border border-input overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setBmForm({ ...bmForm, visibility: "all" })}
                    className={cn("px-3 py-1.5 transition-colors", bmForm.visibility === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setBmForm({ ...bmForm, visibility: "me" })}
                    className={cn("px-3 py-1.5 transition-colors border-l border-input", bmForm.visibility === "me" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                  >
                    Just me
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBmForm(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  <button
                    onClick={saveBookmark}
                    disabled={bmSaving || !bmForm.name.trim() || !bmForm.url.trim()}
                    className="text-xs font-semibold text-primary hover:opacity-70 disabled:opacity-40"
                  >
                    {bmSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {visibleBookmarks.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 px-4 pb-4">
              {visibleBookmarks.map((bm) => {
                const revealed = bmReveal.has(bm.id);
                return (
                  <div key={bm.id} className="relative group/bm">
                    <a
                      href={bm.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-center"
                    >
                      <span className="text-2xl leading-none">{bm.emoji || "🔖"}</span>
                      <span className="text-[11px] font-semibold leading-tight line-clamp-2">{bm.name}</span>
                      {bm.visibility === "me" && (
                        <span className="text-[9px] text-muted-foreground">Only me</span>
                      )}
                    </a>

                    {/* Description reveal + edit/delete controls */}
                    <div className="absolute -top-1.5 -right-1.5 hidden group-hover/bm:flex gap-0.5">
                      {bm.description && (
                        <button
                          onClick={() => setBmReveal((prev) => {
                            const s = new Set(prev);
                            s.has(bm.id) ? s.delete(bm.id) : s.add(bm.id);
                            return s;
                          })}
                          className="h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                        >
                          {revealed ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => setBmForm({ id: bm.id, name: bm.name, url: bm.url, emoji: bm.emoji ?? "🔖", description: bm.description ?? "", visibility: bm.visibility })}
                        className="h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => deleteBookmark(bm.id)}
                        className="h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-destructive shadow-sm"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Description tooltip */}
                    {revealed && bm.description && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-10 p-2 rounded-xl bg-popover border border-border shadow-lg text-xs whitespace-pre-wrap break-words">
                        {bm.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            !bmForm && <div className="px-4 pb-3 text-sm text-muted-foreground">No bookmarks yet — add a shortcut above.</div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{greeting(firstName)}</h1>
          {householdName && <p className="text-sm text-muted-foreground">{householdName}</p>}
        </div>
        <button
          onClick={() => setEditOrder((e) => !e)}
          className={cn(
            "p-1.5 rounded-lg transition-colors mt-0.5 shrink-0",
            editOrder ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          title={editOrder ? "Done arranging" : "Arrange widgets"}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Stats row — always at top */}
      <div className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 flex items-center gap-4">
        <ProgressRing done={todayDone} total={todayTotal} />
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
          <Link href="/progress" className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity">
            <span className="text-xl leading-none">{getLevel(totalPoints).emoji}</span>
            <span className="text-[11px] font-black">{getLevel(totalPoints).name}</span>
            <span className="text-[10px] text-muted-foreground">{totalPoints} pts</span>
          </Link>
          {(membership as any)?.pin && typeof (membership as any)?.balance === "number" && (
            <div className="flex flex-col items-center gap-0.5">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-black text-emerald-600">${((membership as any).balance as number).toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">balance</span>
            </div>
          )}
        </div>
      </div>

      {/* Reorderable widgets */}
      {widgetOrder.map((id, index) => (
        <React.Fragment key={id}>{renderWidget(id, index)}</React.Fragment>
      ))}
    </div>
  );
}
