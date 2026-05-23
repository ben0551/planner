"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type CalendarEvent, type Task } from "@/lib/pocketbase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // shift so Mon = 0
}

type FormMode = "event" | "task";

export default function CalendarPage() {
  const { householdId, user, membership } = useAuth();
  const pb = getClient();
  const isOwner = membership?.role === "owner";
  const userId = user?.id ?? "";
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("event");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);

  function fetchEvents() {
    if (!householdId) return;
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = daysInMonth(year, month);
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    pb.collection("calendar_events")
      .getFullList({
        filter: `household="${householdId}" && start >= "${from}" && start <= "${to}T23:59:59"`,
      })
      .then((items) => setEvents(items as unknown as CalendarEvent[]));
    pb.collection("tasks")
      .getFullList({
        filter: `household="${householdId}" && due_date >= "${from}" && due_date <= "${to}"`,
        sort: "due_date",
      })
      .then((items) => setTasks(items as unknown as Task[]));
  }

  useEffect(() => {
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, year, month]);

  // Check Google Calendar connection and trigger initial sync
  useEffect(() => {
    if (!householdId) return;
    fetch(`/api/google-calendar/status?householdId=${householdId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.connected && data.calendarId) {
          setGcalConnected(true);
          syncFromGoogle();
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  async function syncFromGoogle() {
    if (!householdId) return;
    setSyncing(true);
    try {
      await fetch(`/api/google-calendar/sync?householdId=${householdId}`);
      fetchEvents();
    } finally {
      setSyncing(false);
    }
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  function extractDate(s: string): string {
    return (s.includes("T") ? s.split("T")[0] : s.split(" ")[0]);
  }
  function extractTime(s: string): string {
    const part = s.includes("T") ? s.split("T")[1] : s.split(" ")[1];
    if (!part || part.startsWith("00:00") || part.startsWith("23:59")) return "";
    return part.substring(0, 5);
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev);
    setFormMode("event");
    setTitle(ev.title);
    setStart(extractDate(ev.start));
    setStartTime(extractTime(ev.start));
    setEndTime(extractTime(ev.end));
    setNotes(ev.notes ?? "");
    setShowForm(true);
  }

  function formatTime(t: string): string {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "pm" : "am";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")}${ampm}`;
  }

  function eventTimeLabel(ev: CalendarEvent): string | null {
    if (ev.all_day) return null;
    const timePart = ev.start.includes("T") ? ev.start.split("T")[1] : ev.start.split(" ")[1];
    if (!timePart) return null;
    const start = formatTime(timePart);
    if (!ev.end) return start;
    const endPart = ev.end.includes("T") ? ev.end.split("T")[1] : ev.end.split(" ")[1];
    if (!endPart || endPart === "23:59:59") return start;
    return `${start}–${formatTime(endPart)}`;
  }

  function closeEventForm() {
    setShowForm(false);
    setEditingEvent(null);
    setTitle(""); setStart(""); setStartTime(""); setEndTime(""); setNotes("");
  }

  async function saveEvent() {
    if (!title.trim() || !start || !householdId) return;
    setLoading(true);
    try {
      const allDay = !startTime;
      const startVal = startTime ? `${start} ${startTime}:00` : `${start} 00:00:00`;
      const endVal = endTime
        ? `${start} ${endTime}:00`
        : allDay ? `${start} 23:59:59` : startVal;
      const payload = {
        title: title.trim(),
        start: startVal,
        end: endVal,
        all_day: allDay,
        notes: notes.trim() || undefined,
      };
      if (editingEvent) {
        await pb.collection("calendar_events").update(editingEvent.id, payload);
        setEvents((prev) => prev.map((e) =>
          e.id === editingEvent.id ? { ...e, ...payload } : e
        ));
      } else {
        const ev = await pb.collection("calendar_events").create({
          household: householdId, source: "manual", ...payload,
        });
        setEvents((prev) => [...prev, ev as unknown as CalendarEvent]);
        if (gcalConnected) {
          fetch("/api/google-calendar/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ householdId, plannerEventId: ev.id, ...payload, allDay }),
          });
        }
      }
      closeEventForm();
    } finally {
      setLoading(false);
    }
  }

  async function addTask() {
    if (!title.trim() || !start || !householdId) return;
    setLoading(true);
    try {
      const rec = await pb.collection("tasks").create({
        household: householdId,
        title: title.trim(),
        due_date: start,
        notes: notes.trim() || undefined,
        created_by: userId,
        completed: false,
      });
      setTasks((prev) => [...prev, rec as unknown as Task]);
      setTitle(""); setStart(""); setNotes("");
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(t: Task) {
    await pb.collection("tasks").update(t.id, { completed: !t.completed });
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
  }

  async function deleteEvent(id: string) {
    const ev = events.find((e) => e.id === id);
    await pb.collection("calendar_events").delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));

    // Delete from Google Calendar if it was synced there
    if (gcalConnected && ev?.external_id) {
      fetch(
        `/api/google-calendar/event?householdId=${householdId}&googleEventId=${ev.external_id}`,
        { method: "DELETE" },
      );
    }
  }

  function getEventsForDay(day: number): CalendarEvent[] {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.start.startsWith(prefix));
  }

  function getTasksForDay(day: number): Task[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => {
      if (t.due_date !== dateStr) return false;
      if (isOwner) return true;
      if (!t.assigned_to) return true;
      return t.assigned_to === userId || t.created_by === userId;
    });
  }

  const totalDays = daysInMonth(year, month);
  const firstDay = firstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          {gcalConnected && (
            <Button
              size="sm"
              variant="ghost"
              onClick={syncFromGoogle}
              disabled={syncing}
              title="Sync with Google Calendar"
            >
              {syncing ? "Syncing…" : "↻ Sync"}
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={prevMonth}>←</Button>
            <span className="w-36 text-center text-sm text-muted-foreground">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button variant="ghost" size="sm" onClick={nextMonth}>→</Button>
          </div>
          <Button
            size="sm"
            variant={showForm ? "secondary" : "default"}
            onClick={() => showForm ? closeEventForm() : setShowForm(true)}
          >
            {showForm ? "Cancel" : "+ Add"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 flex flex-col gap-3">
            {/* Mode toggle */}
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1 self-start">
              {(["event", "task"] as FormMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setFormMode(m); setTitle(""); setStart(""); setStartTime(""); setEndTime(""); setNotes(""); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    formMode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "event" ? "📅 Event" : "📋 Task"}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={formMode === "task" ? "e.g. Book dentist" : "e.g. School pickup"}
                autoFocus
              />
            </div>

            {formMode === "event" ? (
              <>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ev-start">Date</Label>
                  <Input
                    id="ev-start"
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ev-start-time">Start time <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      id="ev-start-time"
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:MM e.g. 09:00"
                      maxLength={5}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="ev-end-time">End time <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      id="ev-end-time"
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:MM e.g. 20:00"
                      maxLength={5}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="ev-notes">Notes (optional)</Label>
              <Input
                id="ev-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={formMode === "event" ? saveEvent : addTask}
                disabled={loading || !title.trim() || !start}
              >
                {loading ? "Saving…" : editingEvent ? "Save changes" : formMode === "event" ? "Add event" : "Add task"}
              </Button>
              {editingEvent && (
                <Button variant="ghost" className="text-destructive hover:text-destructive"
                  onClick={() => { deleteEvent(editingEvent.id); closeEventForm(); }}>
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground font-medium text-center">
        {DAY_NAMES.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="rounded-lg h-20" />;
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);

          return (
            <div
              key={day}
              className={`rounded-lg border p-1 h-20 flex flex-col gap-0.5 overflow-hidden ${
                isToday ? "border-primary bg-primary/5" : ""
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {day}
              </span>
              {dayEvents.map((ev) => {
                const timeLabel = eventTimeLabel(ev);
                return (
                  <div key={ev.id} className="flex items-center gap-0.5 group min-w-0">
                    <button
                      onClick={() => openEditEvent(ev)}
                      className="text-xs truncate flex-1 bg-primary/10 text-primary rounded px-1 leading-5 text-left hover:bg-primary/20 transition-colors"
                    >
                      {timeLabel && <span className="font-semibold mr-0.5">{timeLabel}</span>}
                      {ev.title}
                    </button>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="hidden group-hover:block text-muted-foreground hover:text-destructive text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {dayTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTask(t)}
                  className={`flex items-center gap-0.5 min-w-0 text-left rounded px-1 leading-5 transition-opacity ${
                    t.completed
                      ? "bg-amber-50 text-amber-400 opacity-60"
                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  }`}
                  title={t.completed ? "Mark incomplete" : "Mark complete"}
                >
                  <span className="text-[10px] shrink-0">{t.completed ? "✓" : "○"}</span>
                  <span className={`text-xs truncate flex-1 ${t.completed ? "line-through" : ""}`}>
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
