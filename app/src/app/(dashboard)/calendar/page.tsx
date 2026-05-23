"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type CalendarEvent, type Task } from "@/lib/pocketbase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number, startOnSun: boolean): number {
  const day = new Date(year, month, 1).getDay();
  if (startOnSun) return day;
  return day === 0 ? 6 : day - 1;
}

function getWeekStart(d: Date, startOnSun: boolean): Date {
  const date = new Date(d);
  const day = date.getDay();
  const offset = startOnSun ? day : (day === 0 ? 6 : day - 1);
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function extractDate(s: string): string {
  return s.includes("T") ? s.split("T")[0] : s.split(" ")[0];
}

function extractTime(s: string): string {
  const part = s.includes("T") ? s.split("T")[1] : s.split(" ")[1];
  if (!part || part.startsWith("00:00") || part.startsWith("23:59")) return "";
  return part.substring(0, 5);
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
}

function fmtTimeInput(next: string, prev: string): string {
  const digits = next.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits.length === 2 && prev.length < 3 ? digits + ":" : digits;
  return digits.slice(0, 2) + ":" + digits.slice(2, 4);
}

function eventTimeLabel(ev: CalendarEvent): string | null {
  if (ev.all_day) return null;
  const part = ev.start.includes("T") ? ev.start.split("T")[1] : ev.start.split(" ")[1];
  if (!part) return null;
  const t1 = formatTime(part);
  if (!ev.end) return t1;
  const endPart = ev.end.includes("T") ? ev.end.split("T")[1] : ev.end.split(" ")[1];
  if (!endPart || endPart === "23:59:59") return t1;
  return `${t1}–${formatTime(endPart)}`;
}

function isRecurringOnDate(ev: CalendarEvent, dateStr: string): boolean {
  if (!ev.recurrence || ev.recurrence === "none") return false;
  if (ev.recurrence_until && dateStr > ev.recurrence_until) return false;
  const evDateStr = extractDate(ev.start);
  if (dateStr <= evDateStr) return false;
  const start = new Date(evDateStr + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000);
  switch (ev.recurrence) {
    case "daily": return true;
    case "weekly": return diffDays % 7 === 0;
    case "fortnightly": return diffDays % 14 === 0;
    case "monthly": return start.getDate() === target.getDate();
    case "yearly": return start.getDate() === target.getDate() && start.getMonth() === target.getMonth();
    default: return false;
  }
}

function makeOccurrence(ev: CalendarEvent, dateStr: string): CalendarEvent {
  const origDateStr = extractDate(ev.start);
  return {
    ...ev,
    start: dateStr + ev.start.slice(origDateStr.length),
    end: ev.end ? dateStr + ev.end.slice(origDateStr.length) : ev.end,
  };
}

type CalendarView = "month" | "week" | "agenda";
type FormMode = "event" | "task";

export default function CalendarPage() {
  const { householdId, user, membership } = useAuth();
  const pb = getClient();
  const isOwner = membership?.role === "owner";
  const userId = user?.id ?? "";

  const startOnSun =
    typeof window !== "undefined" && localStorage.getItem("planner_week_start") === "sun";
  const today = new Date();
  const todayStr = toDateStr(today);

  const [view, setView] = useState<CalendarView>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("planner_cal_view") as CalendarView | null;
      if (saved === "month" || saved === "week" || saved === "agenda") return saved;
    }
    return "agenda";
  });
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState<string>(() => toDateStr(getWeekStart(today, startOnSun)));
  const [weekDayIdx, setWeekDayIdx] = useState(() => {
    const ws = getWeekStart(today, startOnSun);
    return Math.round((today.getTime() - ws.getTime()) / 86400000);
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recurringEvents, setRecurringEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("event");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(todayStr);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);

  const { rangeFrom, rangeTo } = useMemo(() => {
    if (view === "week") {
      const wsDate = new Date(weekStart + "T00:00:00");
      const end = new Date(wsDate);
      end.setDate(end.getDate() + 6);
      return { rangeFrom: weekStart, rangeTo: toDateStr(end) };
    }
    if (view === "agenda") {
      const end = new Date(today);
      end.setDate(end.getDate() + 60);
      return { rangeFrom: todayStr, rangeTo: toDateStr(end) };
    }
    const last = daysInMonth(year, month);
    return {
      rangeFrom: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      rangeTo: `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, year, month, weekStart]);

  function fetchEvents() {
    if (!householdId) return;
    pb.collection("calendar_events")
      .getFullList({
        filter: `household="${householdId}" && start >= "${rangeFrom}" && start <= "${rangeTo}T23:59:59" && (recurrence="" || recurrence="none")`,
      })
      .then((r) => setEvents(r as unknown as CalendarEvent[]))
      .catch(() =>
        pb.collection("calendar_events")
          .getFullList({ filter: `household="${householdId}" && start >= "${rangeFrom}" && start <= "${rangeTo}T23:59:59"` })
          .then((r) => setEvents(r as unknown as CalendarEvent[]))
      );
    pb.collection("calendar_events")
      .getFullList({ filter: `household="${householdId}" && recurrence!="" && recurrence!="none"` })
      .then((r) => setRecurringEvents(r as unknown as CalendarEvent[]))
      .catch(() => setRecurringEvents([]));
    pb.collection("tasks")
      .getFullList({
        filter: `household="${householdId}" && due_date >= "${rangeFrom}" && due_date <= "${rangeTo}"`,
        sort: "due_date",
      })
      .then((r) => setTasks(r as unknown as Task[]));
  }

  useEffect(() => { fetchEvents(); }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [householdId, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!householdId) return;
    fetch(`/api/google-calendar/status?householdId=${householdId}`)
      .then((r) => r.json())
      .then((d) => { if (d.connected && d.calendarId) { setGcalConnected(true); syncFromGoogle(); } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  async function syncFromGoogle() {
    if (!householdId) return;
    setSyncing(true);
    try { await fetch(`/api/google-calendar/sync?householdId=${householdId}`); fetchEvents(); }
    finally { setSyncing(false); }
  }

  function getEventsForDate(dateStr: string): CalendarEvent[] {
    const direct = events.filter((e) => extractDate(e.start) === dateStr);
    const recur = recurringEvents
      .filter((e) => extractDate(e.start) === dateStr || isRecurringOnDate(e, dateStr))
      .map((e) => extractDate(e.start) === dateStr ? e : makeOccurrence(e, dateStr));
    return [...direct, ...recur];
  }

  function getTasksForDate(dateStr: string): Task[] {
    return tasks.filter((t) => {
      if (t.due_date !== dateStr) return false;
      if (isOwner) return true;
      return !t.assigned_to || t.assigned_to === userId || t.created_by === userId;
    });
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev);
    setFormMode("event");
    setTitle(ev.title);
    setStart(extractDate(ev.start));
    setStartTime(extractTime(ev.start));
    setEndTime(extractTime(ev.end ?? ""));
    setNotes(ev.notes ?? "");
    setRecurrence(ev.recurrence ?? "none");
    setRecurrenceUntil(ev.recurrence_until ?? "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditingEvent(null);
    setTitle(""); setStart(todayStr); setStartTime(""); setEndTime(""); setNotes("");
    setRecurrence("none"); setRecurrenceUntil("");
  }

  function resetFormFields() {
    setTitle(""); setStart(todayStr); setStartTime(""); setEndTime(""); setNotes("");
    setRecurrence("none"); setRecurrenceUntil("");
  }

  async function saveEvent() {
    if (!title.trim() || !start || !householdId) return;
    setLoading(true);
    try {
      const allDay = !startTime;
      const startVal = startTime ? `${start} ${startTime}:00` : `${start} 00:00:00`;
      const endVal = endTime ? `${start} ${endTime}:00` : allDay ? `${start} 23:59:59` : startVal;
      const payload: Record<string, unknown> = {
        title: title.trim(), start: startVal, end: endVal, all_day: allDay,
        notes: notes.trim() || undefined,
        recurrence: recurrence === "none" ? "" : recurrence,
        recurrence_until: recurrenceUntil || undefined,
      };
      if (editingEvent) {
        await pb.collection("calendar_events").update(editingEvent.id, payload);
      } else {
        const ev = await pb.collection("calendar_events").create({ household: householdId, source: "manual", ...payload });
        if (gcalConnected) {
          fetch("/api/google-calendar/event", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ householdId, plannerEventId: ev.id, ...payload, allDay }),
          });
        }
      }
      fetchEvents();
      closeForm();
    } finally { setLoading(false); }
  }

  async function addTask() {
    if (!title.trim() || !start || !householdId) return;
    setLoading(true);
    try {
      await pb.collection("tasks").create({
        household: householdId, title: title.trim(), due_date: start,
        notes: notes.trim() || undefined, created_by: userId, completed: false,
      });
      fetchEvents();
      setShowForm(false); resetFormFields();
    } finally { setLoading(false); }
  }

  async function toggleTask(t: Task) {
    await pb.collection("tasks").update(t.id, { completed: !t.completed });
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, completed: !t.completed } : x));
  }

  async function deleteEvent(id: string) {
    const ev = [...events, ...recurringEvents].find((e) => e.id === id);
    await pb.collection("calendar_events").delete(id);
    setEvents((p) => p.filter((e) => e.id !== id));
    setRecurringEvents((p) => p.filter((e) => e.id !== id));
    if (gcalConnected && ev?.external_id)
      fetch(`/api/google-calendar/event?householdId=${householdId}&googleEventId=${ev.external_id}`, { method: "DELETE" });
  }

  function prevPeriod() {
    if (view === "month") { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); }
    else if (view === "week") setWeekStart((w) => { const d = new Date(w + "T00:00:00"); d.setDate(d.getDate() - 7); return toDateStr(d); });
  }
  function nextPeriod() {
    if (view === "month") { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); }
    else if (view === "week") setWeekStart((w) => { const d = new Date(w + "T00:00:00"); d.setDate(d.getDate() + 7); return toDateStr(d); });
  }
  function goToday() {
    const now = new Date();
    setYear(now.getFullYear()); setMonth(now.getMonth());
    setWeekStart(toDateStr(getWeekStart(now, startOnSun))); setWeekDayIdx(0);
  }

  const periodLabel = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[month]} ${year}`;
    if (view === "week") {
      const wsDate = new Date(weekStart + "T00:00:00");
      const end = new Date(wsDate); end.setDate(end.getDate() + 6);
      if (wsDate.getMonth() === end.getMonth())
        return `${MONTH_NAMES[wsDate.getMonth()]} ${wsDate.getDate()}–${end.getDate()}, ${wsDate.getFullYear()}`;
      return `${MONTH_NAMES[wsDate.getMonth()]} ${wsDate.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
    }
    return "Upcoming";
  }, [view, year, month, weekStart]);

  const DAY_NAMES = startOnSun ? DAY_NAMES_SUN : DAY_NAMES_MON;

  const monthCells = useMemo(() => {
    const total = daysInMonth(year, month);
    const first = firstWeekdayOfMonth(year, month, startOnSun);
    const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month, startOnSun]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart + "T00:00:00"); d.setDate(d.getDate() + i); return d; }),
    [weekStart]);

  const agendaDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i <= 60; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const ds = toDateStr(d);
      const hasEv = events.some((e) => extractDate(e.start) === ds) ||
        recurringEvents.some((e) => extractDate(e.start) === ds || isRecurringOnDate(e, ds));
      const hasTsk = tasks.some((t) => t.due_date === ds &&
        (isOwner || !t.assigned_to || t.assigned_to === userId || t.created_by === userId));
      if (hasEv || hasTsk) days.push(d);
    }
    return days;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, recurringEvents, tasks]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {gcalConnected && (
            <Button size="sm" variant="ghost" onClick={syncFromGoogle} disabled={syncing}>
              {syncing ? "Syncing…" : "↻ Sync"}
            </Button>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            {(["month", "week", "agenda"] as CalendarView[]).map((v) => (
              <button key={v} onClick={() => { setView(v); localStorage.setItem("planner_cal_view", v); }}
                className={cn("px-3 py-1.5 capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/40"
                )}>
                {v}
              </button>
            ))}
          </div>
          {view !== "agenda" && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={prevPeriod}>←</Button>
              <span className="min-w-32 text-center text-sm text-muted-foreground">{periodLabel}</span>
              <Button variant="ghost" size="sm" onClick={nextPeriod}>→</Button>
              <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">Today</Button>
            </div>
          )}
          {view === "agenda" && <span className="text-sm text-muted-foreground">{periodLabel}</span>}
          <Button size="sm" variant={showForm ? "secondary" : "default"}
            onClick={() => showForm ? closeForm() : setShowForm(true)}>
            {showForm ? "Cancel" : "+ Add"}
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 flex flex-col gap-3">
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1 self-start">
              {(["event", "task"] as FormMode[]).map((m) => (
                <button key={m}
                  onClick={() => { setFormMode(m); resetFormFields(); }}
                  className={cn("px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors",
                    formMode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {m === "event" ? "📅 Event" : "📋 Task"}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="ev-title">Title</Label>
              <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={formMode === "task" ? "e.g. Book dentist" : "e.g. School pickup"} autoFocus />
            </div>

            {formMode === "event" ? (
              <>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ev-start">Date</Label>
                  <Input id="ev-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ev-st">Start time <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="ev-st" type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5}
                      value={startTime} onChange={(e) => setStartTime(fmtTimeInput(e.target.value, startTime))} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ev-et">End time <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="ev-et" type="text" inputMode="numeric" placeholder="HH:MM" maxLength={5}
                      value={endTime} onChange={(e) => setEndTime(fmtTimeInput(e.target.value, endTime))} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ev-rec">Repeat</Label>
                  <select id="ev-rec" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {recurrence !== "none" && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ev-until">Repeat until <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="ev-until" type="date" value={recurrenceUntil} onChange={(e) => setRecurrenceUntil(e.target.value)} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <Label htmlFor="task-due">Due date</Label>
                <Input id="task-due" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="ev-notes">Notes (optional)</Label>
              <Input id="ev-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>

            <div className="flex gap-2">
              <Button onClick={formMode === "event" ? saveEvent : addTask}
                disabled={loading || !title.trim() || !start}>
                {loading ? "Saving…" : editingEvent ? "Save changes" : formMode === "event" ? "Add event" : "Add task"}
              </Button>
              {editingEvent && (
                <Button variant="ghost" className="text-destructive hover:text-destructive"
                  onClick={() => { deleteEvent(editingEvent.id); closeForm(); }}>
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Month view ── */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground font-medium text-center">
            {DAY_NAMES.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((day, i) => {
              if (!day) return <div key={`e${i}`} className="rounded-lg h-20" />;
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvts = getEventsForDate(ds);
              const dayTsks = getTasksForDate(ds);
              return (
                <div key={day} className={cn("rounded-lg border p-1 h-20 flex flex-col gap-0.5 overflow-hidden",
                  isToday && "border-primary bg-primary/5")}>
                  <span className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{day}</span>
                  {dayEvts.map((ev) => {
                    const tl = eventTimeLabel(ev);
                    return (
                      <div key={`${ev.id}-${ds}`} className="flex items-center gap-0.5 group min-w-0">
                        <button onClick={() => openEditEvent(ev)}
                          className="text-xs truncate flex-1 bg-primary/10 text-primary rounded px-1 leading-5 text-left hover:bg-primary/20 transition-colors">
                          {ev.recurrence && ev.recurrence !== "none" && <span className="opacity-50 mr-0.5">↻</span>}
                          {tl && <span className="font-semibold mr-0.5">{tl}</span>}
                          {ev.title}
                        </button>
                        <button onClick={() => deleteEvent(ev.id)}
                          className="hidden group-hover:block text-muted-foreground hover:text-destructive text-xs shrink-0">✕</button>
                      </div>
                    );
                  })}
                  {dayTsks.map((t) => (
                    <button key={t.id} onClick={() => toggleTask(t)}
                      className={cn("flex items-center gap-0.5 min-w-0 text-left rounded px-1 leading-5 transition-opacity",
                        t.completed ? "bg-amber-50 text-amber-400 opacity-60" : "bg-amber-100 text-amber-800 hover:bg-amber-200")}>
                      <span className="text-[10px] shrink-0">{t.completed ? "✓" : "○"}</span>
                      <span className={cn("text-xs truncate flex-1", t.completed && "line-through")}>{t.title}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Week view ── */}
      {view === "week" && (
        <>
          {/* Desktop: 7 columns */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {weekDays.map((d, i) => {
              const ds = toDateStr(d);
              const isToday = ds === todayStr;
              const dayEvts = getEventsForDate(ds);
              const dayTsks = getTasksForDate(ds);
              return (
                <div key={ds} className="flex flex-col gap-1">
                  <div className={cn("text-center py-1 rounded-lg text-xs font-medium",
                    isToday ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground")}>
                    <div>{DAY_NAMES[i]}</div>
                    <div className="text-base font-bold leading-tight">{d.getDate()}</div>
                  </div>
                  <div className="flex flex-col gap-0.5 min-h-40 rounded-lg border border-border/50 p-1">
                    {dayEvts.map((ev) => {
                      const tl = eventTimeLabel(ev);
                      return (
                        <button key={`${ev.id}-${ds}`} onClick={() => openEditEvent(ev)}
                          className="text-xs text-left bg-primary/10 text-primary rounded px-1.5 py-0.5 hover:bg-primary/20 transition-colors w-full truncate">
                          {ev.recurrence && ev.recurrence !== "none" && <span className="opacity-50 mr-0.5">↻</span>}
                          {tl && <span className="font-semibold text-[10px] block">{tl}</span>}
                          {ev.title}
                        </button>
                      );
                    })}
                    {dayTsks.map((t) => (
                      <button key={t.id} onClick={() => toggleTask(t)}
                        className={cn("text-xs text-left rounded px-1.5 py-0.5 w-full truncate transition-opacity",
                          t.completed ? "bg-amber-50 text-amber-400 opacity-60 line-through" : "bg-amber-100 text-amber-800 hover:bg-amber-200")}>
                        {t.completed ? "✓ " : "○ "}{t.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: day chip tabs */}
          <div className="md:hidden flex flex-col gap-3">
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {weekDays.map((d, i) => {
                const ds = toDateStr(d);
                const isToday = ds === todayStr;
                const hasItems = getEventsForDate(ds).length > 0 || getTasksForDate(ds).length > 0;
                return (
                  <button key={ds} onClick={() => setWeekDayIdx(i)}
                    className={cn("flex flex-col items-center px-2.5 py-1.5 rounded-xl min-w-[44px] transition-colors relative shrink-0",
                      weekDayIdx === i ? "bg-primary text-primary-foreground"
                        : isToday ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/40")}>
                    <span className="text-[10px] font-medium">{DAY_NAMES[i]}</span>
                    <span className="text-sm font-bold">{d.getDate()}</span>
                    {hasItems && (
                      <span className={cn("absolute bottom-1 w-1 h-1 rounded-full",
                        weekDayIdx === i ? "bg-primary-foreground" : "bg-primary")} />
                    )}
                  </button>
                );
              })}
            </div>
            {(() => {
              const d = weekDays[weekDayIdx];
              const ds = toDateStr(d);
              const dayEvts = getEventsForDate(ds);
              const dayTsks = getTasksForDate(ds);
              return (
                <div className="flex flex-col gap-2">
                  {dayEvts.length === 0 && dayTsks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-10">Nothing on this day</p>
                  )}
                  {dayEvts.map((ev) => {
                    const tl = eventTimeLabel(ev);
                    return (
                      <Card key={`${ev.id}-${ds}`} className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => openEditEvent(ev)}>
                        <CardContent className="py-2 px-3">
                          <div className="text-sm font-medium">
                            {ev.recurrence && ev.recurrence !== "none" && <span className="text-muted-foreground text-xs mr-1">↻</span>}
                            {ev.title}
                          </div>
                          {tl && <div className="text-xs text-muted-foreground">{tl}</div>}
                          {ev.notes && <div className="text-xs text-muted-foreground truncate">{ev.notes}</div>}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {dayTsks.map((t) => (
                    <Card key={t.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleTask(t)}>
                      <CardContent className="py-2 px-3 flex items-center gap-2">
                        <span className="text-sm shrink-0">{t.completed ? "✓" : "○"}</span>
                        <span className={cn("text-sm flex-1", t.completed && "line-through text-muted-foreground")}>{t.title}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* ── Agenda view ── */}
      {view === "agenda" && (
        <div className="flex flex-col gap-5">
          {agendaDays.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-16">No upcoming events or tasks in the next 60 days</p>
          )}
          {agendaDays.map((d) => {
            const ds = toDateStr(d);
            const isToday = ds === todayStr;
            const dayEvts = getEventsForDate(ds);
            const dayTsks = getTasksForDate(ds);
            const dayIdx = startOnSun ? d.getDay() : (d.getDay() === 0 ? 6 : d.getDay() - 1);
            return (
              <div key={ds} className="flex gap-3">
                <div className={cn("w-12 shrink-0 text-right pt-0.5", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                  <div className="text-[10px] font-medium">{DAY_NAMES[dayIdx]}</div>
                  <div className="text-xl font-black leading-tight">{d.getDate()}</div>
                  <div className="text-[10px]">{MONTH_NAMES[d.getMonth()].slice(0, 3)}</div>
                </div>
                <div className="flex-1 flex flex-col gap-1.5 border-l-2 border-border pl-3 min-w-0">
                  {dayEvts.map((ev) => {
                    const tl = eventTimeLabel(ev);
                    return (
                      <div key={`${ev.id}-${ds}`} className="flex items-start gap-1 group">
                        <button onClick={() => openEditEvent(ev)}
                          className="flex-1 min-w-0 text-left bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-2 transition-colors">
                          <div className="text-sm font-medium">
                            {ev.recurrence && ev.recurrence !== "none" && <span className="text-muted-foreground text-xs mr-1">↻</span>}
                            {ev.title}
                          </div>
                          {tl && <div className="text-xs text-primary/70">{tl}</div>}
                          {ev.notes && <div className="text-xs text-muted-foreground truncate">{ev.notes}</div>}
                        </button>
                        <button onClick={() => deleteEvent(ev.id)}
                          className="hidden group-hover:flex mt-2.5 text-muted-foreground hover:text-destructive text-xs shrink-0">✕</button>
                      </div>
                    );
                  })}
                  {dayTsks.map((t) => (
                    <button key={t.id} onClick={() => toggleTask(t)}
                      className={cn("text-left rounded-lg px-3 py-2 transition-colors",
                        t.completed ? "bg-amber-50/50 opacity-60" : "bg-amber-50 hover:bg-amber-100")}>
                      <div className={cn("flex items-center gap-1.5", t.completed ? "text-amber-400" : "text-amber-800")}>
                        <span className="text-xs">{t.completed ? "✓" : "○"}</span>
                        <span className={cn("text-sm", t.completed && "line-through")}>{t.title}</span>
                      </div>
                      {t.notes && <div className="text-xs text-muted-foreground ml-4 truncate">{t.notes}</div>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
