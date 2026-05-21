"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/auth";
import { getClient } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserPlus, ChevronRight, CalendarRange, Database, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type CustodyWeek = "odd" | "even" | "";

const CUSTODY_OPTIONS: { value: CustodyWeek; label: string; sub: string }[] = [
  { value: "odd",  label: "Odd weeks",  sub: "Weeks 1, 3, 5, 7…" },
  { value: "even", label: "Even weeks", sub: "Weeks 2, 4, 6, 8…" },
  { value: "",     label: "Not applicable", sub: "No shared custody schedule" },
];

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { user, membership, householdId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pb = getClient();
  const household = membership?.expand?.household;
  const isOwner = membership?.role === "owner";

  const [custodyWeek, setCustodyWeek] = useState<CustodyWeek>("");
  const [custodySaving, setCustodySaving] = useState(false);
  const [custodySaved, setCustodySaved] = useState(false);
  const [custodyError, setCustodyError] = useState("");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    setCustodyWeek((household?.custody_week as CustodyWeek) ?? "");
  }, [household?.custody_week]);
  const [migrateLog, setMigrateLog] = useState<string[] | null>(null);
  const [migrateError, setMigrateError] = useState("");

  // Google Calendar
  const [gcalStatus, setGcalStatus] = useState<{
    connected: boolean;
    calendarId?: string;
  } | null>(null);
  const [gcalCalendars, setGcalCalendars] = useState<{ id: string; summary: string; primary?: boolean }[]>([]);
  const [gcalPickerOpen, setGcalPickerOpen] = useState(false);
  const [gcalSaving, setGcalSaving] = useState(false);
  const [gcalMsg, setGcalMsg] = useState("");

  useEffect(() => {
    if (!householdId || !isOwner) return;
    fetch(`/api/google-calendar/status?householdId=${householdId}`)
      .then((r) => r.json())
      .then(setGcalStatus);

    const gcal = searchParams.get("gcal");
    if (gcal === "connected") setGcalMsg("Google Calendar connected!");
    if (gcal === "denied") setGcalMsg("Google authorisation was cancelled.");
    if (gcal === "error") setGcalMsg("Google Calendar connection failed.");
  }, [householdId, isOwner, searchParams]);

  async function openCalendarPicker() {
    setGcalPickerOpen(true);
    if (gcalCalendars.length === 0) {
      const res = await fetch(`/api/google-calendar/calendars?householdId=${householdId}`);
      const data = await res.json();
      setGcalCalendars(data.calendars ?? []);
    }
  }

  async function selectCalendar(calendarId: string) {
    setGcalSaving(true);
    await fetch("/api/google-calendar/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId, calendarId }),
    });
    setGcalStatus((s) => ({ ...s, connected: true, calendarId }));
    setGcalPickerOpen(false);
    setGcalSaving(false);
    setGcalMsg("Calendar selected. Events will sync when you open the Calendar page.");
  }

  async function disconnectGcal() {
    if (!confirm("Disconnect Google Calendar? Synced events in Planner will remain but won't update.")) return;
    await fetch("/api/google-calendar/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId }),
    });
    setGcalStatus({ connected: false });
    setGcalMsg("Disconnected.");
  }

  async function runMigration() {
    setMigrating(true);
    setMigrateLog(null);
    setMigrateError("");
    try {
      const res = await fetch("/api/migrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Migration failed.");
      setMigrateLog(data.log ?? []);
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "Migration failed.");
    } finally {
      setMigrating(false);
    }
  }

  async function saveCustodyWeek() {
    if (!household?.id) return;
    setCustodySaving(true);
    setCustodyError("");
    try {
      await pb.collection("households").update(household.id, { custody_week: custodyWeek });
      setCustodySaved(true);
      setTimeout(() => setCustodySaved(false), 2000);
    } catch (err: any) {
      setCustodyError(err?.message ?? "Save failed. Try running Sync Database in the section below.");
    } finally {
      setCustodySaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Household */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Household</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{household?.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Your role: <Badge variant="secondary">{membership?.role}</Badge>
          </p>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Account</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{user?.name as string}</p>
          <p className="text-xs text-muted-foreground">{user?.email as string}</p>
        </div>
      </div>

      {/* Custody schedule — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Custody Schedule</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Set which weeks the kids are with you. Chores can then be set to <strong>"My Week"</strong> and will automatically appear on the right weeks.
            </p>
            {custodyError && <p className="text-xs text-destructive">{custodyError}</p>}
            <div className="flex flex-col gap-2">
              {CUSTODY_OPTIONS.map((opt) => (
                <label key={opt.value}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                    custodyWeek === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  )}
                >
                  <input
                    type="radio"
                    name="custody"
                    value={opt.value}
                    checked={custodyWeek === opt.value}
                    onChange={() => setCustodyWeek(opt.value)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="self-start rounded-xl"
              disabled={custodySaving}
              onClick={saveCustodyWeek}
            >
              {custodySaving ? "Saving…" : custodySaved ? "✓ Saved!" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Google Calendar — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Google Calendar</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {gcalMsg && <p className="text-xs text-primary">{gcalMsg}</p>}
            {gcalStatus === null ? (
              <p className="text-xs text-muted-foreground">Checking…</p>
            ) : !gcalStatus.connected ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Connect your Google account to sync Planner events with Google Calendar.
                </p>
                <Button
                  size="sm"
                  className="self-start rounded-xl"
                  onClick={() => window.location.href = `/api/google-calendar/auth?householdId=${householdId}`}
                >
                  Connect Google Calendar
                </Button>
              </>
            ) : (
              <>
                {gcalStatus.calendarId ? (
                  <p className="text-xs text-muted-foreground">
                    Syncing with calendar ID: <strong className="font-mono">{gcalStatus.calendarId}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Connected — choose a calendar to sync.</p>
                )}
                {!gcalPickerOpen ? (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={openCalendarPicker}>
                      {gcalStatus.calendarId ? "Change calendar" : "Select calendar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl text-destructive hover:text-destructive" onClick={disconnectGcal}>
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {gcalCalendars.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Loading calendars…</p>
                    ) : (
                      gcalCalendars.map((cal) => (
                        <button
                          key={cal.id}
                          onClick={() => selectCalendar(cal.id)}
                          disabled={gcalSaving}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 text-left cursor-pointer transition-colors",
                            gcalStatus.calendarId === cal.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/30"
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{cal.summary}</p>
                            {cal.primary && <p className="text-xs text-muted-foreground">Primary</p>}
                          </div>
                        </button>
                      ))
                    )}
                    <button onClick={() => setGcalPickerOpen(false)} className="text-xs text-muted-foreground hover:underline self-start">
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Sync database — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Database</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              After updating the app, run this to add any new fields to your database. Safe to run multiple times.
            </p>
            {migrateError && <p className="text-xs text-destructive">{migrateError}</p>}
            {migrateLog && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                {migrateLog.map((line, i) => <p key={i}>{line}</p>)}
              </div>
            )}
            <Button size="sm" variant="outline" className="self-start rounded-xl" disabled={migrating} onClick={runMigration}>
              {migrating ? "Syncing…" : migrateLog ? "✓ Synced" : "Sync Database"}
            </Button>
          </div>
        </div>
      )}

      {/* Owner-only actions */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden divide-y">
          <button
            onClick={() => router.push("/settings/members")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Members</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => router.push("/settings/invite")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Invite member</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
