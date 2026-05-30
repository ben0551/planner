"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type ShoppingCatalog } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserPlus, ChevronRight, ChevronDown, CalendarRange, Database, CalendarDays, Moon, Sun, ShoppingCart, Pencil, Check, Trash2, Search, X, Palette, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEMES, applyTheme } from "@/lib/themes";

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
  const { user, membership, householdId, updateMembershipTheme } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pb = getClient();
  const household = membership?.expand?.household;
  const isOwner = membership?.role === "owner";

  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("planner_dark", next ? "1" : "0");
  }

  const [themeName, setThemeName] = useState(membership?.theme ?? "violet");
  useEffect(() => { if (membership?.theme) setThemeName(membership.theme); }, [membership?.theme]);
  async function saveTheme(name: string) {
    setThemeName(name);
    applyTheme(name);
    updateMembershipTheme(name);
    if ((membership as any)?.id) {
      await pb.collection("memberships").update((membership as any).id, { theme: name });
    }
  }

  const [custodyWeek, setCustodyWeek] = useState<CustodyWeek>("");
  const [custodySaving, setCustodySaving] = useState(false);
  const [custodySaved, setCustodySaved] = useState(false);
  const [custodyError, setCustodyError] = useState("");

  const [weekStart, setWeekStart] = useState<"mon" | "sun">("sun");
  const [weekStartSaving, setWeekStartSaving] = useState(false);
  const [weekStartSaved, setWeekStartSaved] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const [kidsCanCheckShopping, setKidsCanCheckShopping] = useState(false);
  const [kidsCanCheckSaving, setKidsCanCheckSaving] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[] | null>(null);
  const [importError, setImportError] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ShoppingCatalog[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogEditId, setCatalogEditId] = useState<string | null>(null);
  const [catalogDraft, setCatalogDraft] = useState({ category: "", good_price: "" });

  useEffect(() => {
    setKidsCanCheckShopping(!!(household as any)?.kids_can_check_shopping);
    setCustodyWeek((household?.custody_week as CustodyWeek) ?? "");
    if (household?.week_start) setWeekStart(household.week_start);
    else {
      const stored = localStorage.getItem("planner_week_start");
      if (stored === "sun" || stored === "mon") setWeekStart(stored);
    }
  }, [household?.custody_week, household?.week_start]);
  const [migrateLog, setMigrateLog] = useState<string[] | null>(null);
  const [migrateError, setMigrateError] = useState("");

  // Google Calendar
  const [gcalStatus, setGcalStatus] = useState<{
    connected: boolean;
    hasCredentials?: boolean;
    calendarId?: string;
  } | null>(null);
  const [gcalCalendars, setGcalCalendars] = useState<{ id: string; summary: string; primary?: boolean; timeZone?: string }[]>([]);
  const [gcalPickerOpen, setGcalPickerOpen] = useState(false);
  const [gcalSaving, setGcalSaving] = useState(false);
  const [gcalMsg, setGcalMsg] = useState("");
  const [gcalClientId, setGcalClientId] = useState("");
  const [gcalClientSecret, setGcalClientSecret] = useState("");
  const [gcalCredsSaving, setGcalCredsSaving] = useState(false);
  const [gcalCredsMsg, setGcalCredsMsg] = useState("");
  const [gcalShowCreds, setGcalShowCreds] = useState(false);

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

  async function selectCalendar(calendarId: string, calendarTimezone?: string) {
    setGcalSaving(true);
    await fetch("/api/google-calendar/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId, calendarId, calendarTimezone }),
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
    setGcalStatus((s) => ({ ...s, connected: false }));
    setGcalMsg("Disconnected.");
  }

  async function saveGcalCredentials() {
    if (!gcalClientId.trim() || !gcalClientSecret.trim()) return;
    setGcalCredsSaving(true);
    setGcalCredsMsg("");
    try {
      const res = await fetch("/api/google-calendar/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, clientId: gcalClientId, clientSecret: gcalClientSecret }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setGcalStatus((s) => ({ ...s, connected: s?.connected ?? false, hasCredentials: true }));
      setGcalCredsMsg("Credentials saved.");
      setGcalShowCreds(false);
      setGcalClientId("");
      setGcalClientSecret("");
    } catch (e: any) {
      setGcalCredsMsg(e.message ?? "Save failed.");
    } finally {
      setGcalCredsSaving(false);
    }
  }

  async function exportData() {
    if (!householdId) return;
    setExporting(true);
    try {
      const COLLECTIONS = [
        "meal_recipes", "meals", "shopping_catalog", "shopping_items",
        "chores", "goals", "calendar_events", "notes", "tasks",
      ];
      const data: Record<string, any[]> = {};

      for (const name of COLLECTIONS) {
        try {
          data[name] = await pb.collection(name).getFullList({ filter: `household="${householdId}"` });
        } catch {
          data[name] = [];
        }
      }

      const choreIds = (data.chores ?? []).map((c: any) => c.id);
      if (choreIds.length > 0) {
        const f = choreIds.map((id: string) => `chore="${id}"`).join("||");
        try { data.chore_completions = await pb.collection("chore_completions").getFullList({ filter: f }); }
        catch { data.chore_completions = []; }
      } else {
        data.chore_completions = [];
      }

      const blob = new Blob([JSON.stringify({ version: 1, exported_at: new Date().toISOString(), household: { name: household?.name }, data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planner-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function importData(file: File) {
    setImporting(true);
    setImportLog(null);
    setImportError("");
    try {
      const exportObj = JSON.parse(await file.text());
      if (!exportObj.version || !exportObj.data) throw new Error("Invalid export file.");

      const log: string[] = [];
      const idMap: Record<string, string> = {};
      const STRIP = new Set(["id", "collectionId", "collectionName", "created", "updated", "expand"]);
      const USER_FIELDS = new Set(["user", "assignee", "assigned_to", "created_by", "added_by"]);

      function prep(record: any): any {
        const r: any = { household: householdId };
        for (const [k, v] of Object.entries(record)) {
          if (!STRIP.has(k) && !USER_FIELDS.has(k)) r[k] = v;
        }
        return r;
      }

      const ORDER = [
        "meal_recipes", "meals", "shopping_catalog", "shopping_items",
        "chores", "goals", "calendar_events", "notes", "tasks",
      ];
      for (const name of ORDER) {
        const records: any[] = exportObj.data[name] ?? [];
        if (!records.length) continue;
        let n = 0;
        for (const rec of records) {
          try {
            const created = await pb.collection(name).create(prep(rec));
            if (rec.id) idMap[rec.id] = created.id;
            n++;
          } catch (e: any) {
            log.push(`⚠ ${name}: ${e?.message ?? "failed"}`);
          }
        }
        log.push(`✓ ${name}: ${n} imported`);
      }

      const completions: any[] = exportObj.data.chore_completions ?? [];
      if (completions.length) {
        let n = 0;
        for (const rec of completions) {
          const newChore = idMap[rec.chore];
          if (!newChore) continue;
          try {
            await pb.collection("chore_completions").create({ chore: newChore, date: rec.date, points: rec.points });
            n++;
          } catch { /* skip */ }
        }
        log.push(`✓ chore_completions: ${n} imported`);
      }

      setImportLog(log);
    } catch (err: any) {
      setImportError(err?.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
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

  async function loadCatalog() {
    if (!householdId || catalogItems !== null) return;
    setCatalogLoading(true);
    try {
      const items = await pb.collection("shopping_catalog").getFullList({ filter: `household="${householdId}"` });
      setCatalogItems((items as unknown as ShoppingCatalog[]).sort((a, b) => a.name.localeCompare(b.name)));
    } finally { setCatalogLoading(false); }
  }

  async function saveCatalogItem() {
    if (!catalogEditId) return;
    await pb.collection("shopping_catalog").update(catalogEditId, {
      category: catalogDraft.category.trim() || null,
      good_price: catalogDraft.good_price.trim() || null,
    });
    setCatalogItems((prev) => prev?.map((i) =>
      i.id === catalogEditId ? { ...i, category: catalogDraft.category.trim() || undefined, good_price: catalogDraft.good_price.trim() || undefined } : i
    ) ?? null);
    setCatalogEditId(null);
  }

  async function deleteCatalogItem(id: string) {
    await pb.collection("shopping_catalog").delete(id);
    setCatalogItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
  }

  async function saveWeekStart(value: "mon" | "sun") {
    setWeekStart(value);
    setWeekStartSaving(true);
    try {
      localStorage.setItem("planner_week_start", value);
      if (household?.id) {
        await pb.collection("households").update(household.id, { week_start: value });
      }
      setWeekStartSaved(true);
      setTimeout(() => setWeekStartSaved(false), 2000);
    } finally {
      setWeekStartSaving(false);
    }
  }

  async function toggleKidsCanCheckShopping() {
    if (!household?.id) return;
    const next = !kidsCanCheckShopping;
    setKidsCanCheckShopping(next);
    setKidsCanCheckSaving(true);
    try {
      await pb.collection("households").update(household.id, { kids_can_check_shopping: next });
    } finally {
      setKidsCanCheckSaving(false);
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
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Household</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1.5">
          <p className="text-sm font-semibold">{household?.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Your role: <Badge variant="secondary">{membership?.role}</Badge>
          </p>
          {(household as any)?.slug && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">Family URL:</p>
              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                {typeof window !== "undefined" ? window.location.origin : ""}/{(household as any).slug}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${(household as any).slug}`)}
                className="text-xs text-primary hover:underline"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Account</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{user?.name as string}</p>
          <p className="text-xs text-muted-foreground">{user?.email as string}</p>
        </div>
      </div>

      {/* Dark mode */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            <span className="text-sm font-semibold">Dark mode</span>
          </div>
          <button
            onClick={toggleDark}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              dark ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              dark ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
      </div>

      {/* Theme picker */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Theme</span>
        </div>
        <div className="px-4 py-3 grid grid-cols-6 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.name}
              title={t.label}
              onClick={() => saveTheme(t.name)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all",
                themeName === t.name ? "ring-2 ring-primary ring-offset-1" : "hover:bg-muted/40"
              )}
            >
              <span
                className="h-8 w-8 rounded-full shadow-sm"
                style={{ background: t.gradient }}
              />
              <span className="text-[9px] text-muted-foreground leading-tight text-center">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Week start — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              <div>
                <span className="text-sm font-semibold">Week starts on</span>
                {weekStartSaved && <span className="ml-2 text-xs text-primary">✓ Saved</span>}
              </div>
            </div>
            <div className="flex gap-1 rounded-xl border border-border overflow-hidden">
              {(["sun", "mon"] as const).map((v) => (
                <button
                  key={v}
                  disabled={weekStartSaving}
                  onClick={() => saveWeekStart(v)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium transition-colors",
                    weekStart === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {v === "sun" ? "Sunday" : "Monday"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custody schedule — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
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
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Google Calendar</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {gcalMsg && <p className="text-xs text-primary">{gcalMsg}</p>}
            {gcalStatus === null ? (
              <p className="text-xs text-muted-foreground">Checking…</p>
            ) : (
              <>
                {/* Credentials setup */}
                {(!gcalStatus.hasCredentials || gcalShowCreds) && (
                  <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold">Google API credentials</p>
                    <p className="text-xs text-muted-foreground">
                      Create an OAuth 2.0 Client ID in{" "}
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="underline">
                        Google Cloud Console
                      </a>{" "}
                      (type: Web application). Set the authorised redirect URI to:
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                      {typeof window !== "undefined" ? window.location.origin : ""}/api/google-calendar/callback
                    </code>
                    {gcalCredsMsg && <p className="text-xs text-primary">{gcalCredsMsg}</p>}
                    <Input
                      placeholder="Client ID"
                      value={gcalClientId}
                      onChange={(e) => setGcalClientId(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Client Secret"
                      type="password"
                      value={gcalClientSecret}
                      onChange={(e) => setGcalClientSecret(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-xl" disabled={gcalCredsSaving || !gcalClientId || !gcalClientSecret} onClick={saveGcalCredentials}>
                        {gcalCredsSaving ? "Saving…" : "Save credentials"}
                      </Button>
                      {gcalShowCreds && (
                        <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setGcalShowCreds(false)}>Cancel</Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Connect / calendar picker */}
                {gcalStatus.hasCredentials && !gcalStatus.connected && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Connect your Google account to sync Planner events with Google Calendar.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="self-start rounded-xl" onClick={() => window.location.href = `/api/google-calendar/auth?householdId=${householdId}`}>
                        Connect Google Calendar
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setGcalShowCreds(true)}>
                        Update credentials
                      </Button>
                    </div>
                  </>
                )}

                {gcalStatus.connected && (
                  <>
                    {gcalStatus.calendarId ? (
                      <p className="text-xs text-muted-foreground">
                        Syncing with calendar: <strong className="font-mono">{gcalStatus.calendarId}</strong>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Connected — choose a calendar to sync.</p>
                    )}
                    {!gcalPickerOpen ? (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={openCalendarPicker}>
                          {gcalStatus.calendarId ? "Change calendar" : "Select calendar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setGcalShowCreds(true)}>
                          Update credentials
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
                              onClick={() => selectCalendar(cal.id, cal.timeZone)}
                              disabled={gcalSaving}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border p-3 text-left cursor-pointer transition-colors",
                                gcalStatus.calendarId === cal.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted/30"
                              )}
                            >
                              <p className="text-sm font-medium">{cal.summary}</p>
                              {cal.primary && <p className="text-xs text-muted-foreground">Primary</p>}
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Sync database — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
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

      {/* Data export / import — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Data Export &amp; Import</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Export all your household data as a JSON file. You can import it into a self-hosted Planner instance. Imported records are linked to the current household; user assignments are stripped.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={exporting} onClick={exportData}>
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting…" : "Export all data"}
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" disabled={importing} onClick={() => importFileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                {importing ? "Importing…" : "Import from file"}
              </Button>
              <input
                ref={importFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (!confirm(`Import data from "${file.name}" into this household? Existing records won't be deleted.`)) return;
                  importData(file);
                }}
              />
            </div>

            {importError && <p className="text-xs text-destructive">{importError}</p>}
            {importLog && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                {importLog.map((line, i) => <p key={i}>{line}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shopping Catalog — admin only */}
      {isOwner && <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => { setShowCatalog((s) => !s); if (!showCatalog) loadCatalog(); }}
          className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
        >
          <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
          <p className="flex-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">Shopping Catalog</p>
          {showCatalog ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showCatalog && (
          <div className="border-t px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Items remembered from your shopping list. Update categories and good prices, or remove items you no longer buy.
            </p>
            {catalogLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {catalogItems !== null && (
              <>
                <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search catalog…"
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  {catalogSearch && (
                    <button onClick={() => setCatalogSearch("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  )}
                </div>
                {catalogItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">No items yet — they're saved automatically when you add things to a shopping list.</p>
                )}
                <div className="flex flex-col divide-y">
                  {catalogItems
                    .filter((i) => !catalogSearch || i.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                    .map((item) =>
                      catalogEditId === item.id ? (
                        <div key={item.id} className="flex items-center gap-2 py-2 flex-wrap">
                          <span className="text-sm font-medium flex-1 min-w-28">{item.name}</span>
                          <Input
                            value={catalogDraft.category}
                            onChange={(e) => setCatalogDraft((d) => ({ ...d, category: e.target.value }))}
                            placeholder="Category"
                            className="h-7 w-28 text-xs"
                          />
                          <Input
                            value={catalogDraft.good_price}
                            onChange={(e) => setCatalogDraft((d) => ({ ...d, good_price: e.target.value }))}
                            placeholder="≤ good price"
                            className="h-7 w-28 text-xs"
                            onKeyDown={(e) => { if (e.key === "Enter") saveCatalogItem(); if (e.key === "Escape") setCatalogEditId(null); }}
                          />
                          <button onClick={saveCatalogItem} className="text-primary hover:opacity-70 shrink-0"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setCatalogEditId(null)} className="text-muted-foreground hover:opacity-70 shrink-0"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div key={item.id} className="flex items-center gap-3 py-2 group">
                          <span className="flex-1 text-sm">{item.name}</span>
                          {item.category && (
                            <span className="text-xs text-muted-foreground shrink-0">{item.category}</span>
                          )}
                          {item.good_price && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">≤ {item.good_price}</span>
                          )}
                          <button
                            onClick={() => { setCatalogEditId(item.id); setCatalogDraft({ category: item.category ?? "", good_price: item.good_price ?? "" }); }}
                            className="hidden group-hover:flex text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCatalogItem(item.id)}
                            className="hidden group-hover:flex text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    )}
                </div>
              </>
            )}
          </div>
        )}
      </div>}

      {/* Kids permissions — owners only */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 border-b">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Kids Permissions</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Check shopping items</p>
              <p className="text-xs text-muted-foreground">Allow kids to tick items into the basket during a shop.</p>
            </div>
            <button
              onClick={toggleKidsCanCheckShopping}
              disabled={kidsCanCheckSaving}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                kidsCanCheckShopping ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                kidsCanCheckShopping ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
        </div>
      )}

      {/* Owner-only actions */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden divide-y">
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
