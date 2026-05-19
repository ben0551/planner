"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type CalendarEvent } from "@/lib/pocketbase";
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

export default function CalendarPage() {
  const { householdId } = useAuth();
  const pb = getClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = daysInMonth(year, month);
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    pb.collection("calendar_events")
      .getFullList({
        filter: `household="${householdId}" && start >= "${from}" && start <= "${to}T23:59:59"`,
      })
      .then((items) => setEvents(items as unknown as CalendarEvent[]));
  }, [householdId, year, month]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  async function addEvent() {
    if (!title.trim() || !start || !householdId) return;
    setLoading(true);
    try {
      const startVal = allDay ? `${start} 00:00:00` : start;
      const endVal = end
        ? allDay ? `${end} 23:59:59` : end
        : allDay ? `${start} 23:59:59` : startVal;
      const ev = await pb.collection("calendar_events").create({
        household: householdId,
        title: title.trim(),
        start: startVal,
        end: endVal,
        all_day: allDay,
        source: "manual",
        notes: notes.trim() || undefined,
      });
      setEvents((prev) => [...prev, ev as unknown as CalendarEvent]);
      setTitle(""); setStart(""); setEnd(""); setAllDay(true); setNotes("");
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEvent(id: string) {
    await pb.collection("calendar_events").delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function getEventsForDay(day: number): CalendarEvent[] {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.start.startsWith(prefix));
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
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "+ Add event"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. School pickup"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ev-allday"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="ev-allday">All day</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="ev-start">Start</Label>
                <Input
                  id="ev-start"
                  type={allDay ? "date" : "datetime-local"}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="ev-end">End (optional)</Label>
                <Input
                  id="ev-end"
                  type={allDay ? "date" : "datetime-local"}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ev-notes">Notes</Label>
              <Input
                id="ev-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button onClick={addEvent} disabled={loading || !title.trim() || !start}>
              Add event
            </Button>
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
              {dayEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-0.5 group min-w-0">
                  <span className="text-xs truncate flex-1 bg-primary/10 text-primary rounded px-1 leading-5">
                    {ev.title}
                  </span>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    className="hidden group-hover:block text-muted-foreground hover:text-destructive text-xs flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
