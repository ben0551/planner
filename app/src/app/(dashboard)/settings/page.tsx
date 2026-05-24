"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type ShoppingCatalog } from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserPlus, ChevronRight, ChevronDown, CalendarRange, Database, CalendarDays, Moon, Sun, ShoppingCart, Pencil, Check, Trash2, Search, X } from "lucide-react";
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
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{household?.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Your role: <Badge variant="secondary">{membership?.role}</Badge>
          </p>
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
