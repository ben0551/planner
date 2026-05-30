"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Bookmark } from "@/lib/pocketbase";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

function faviconUrl(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return ""; }
}

function BookmarkIcon({ bm }: { bm: Bookmark }) {
  const [failed, setFailed] = useState(false);
  const hasEmoji = bm.emoji && bm.emoji.trim() !== "" && bm.emoji.trim() !== "🔖";
  if (hasEmoji) return <span className="text-3xl leading-none">{bm.emoji}</span>;
  const fav = faviconUrl(bm.url);
  if (fav && !failed) {
    return <img src={fav} alt="" className="h-9 w-9 object-contain" onError={() => setFailed(true)} />;
  }
  return <span className="text-3xl leading-none">🔖</span>;
}

type BmForm = { id?: string; name: string; url: string; emoji: string; description: string; visibility: "all" | "me" };

export default function BookmarksPage() {
  const { householdId, user, membership } = useAuth();
  const pb = getClient();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<BmForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState<Set<string>>(new Set());
  const [bmHidden, setBmHidden] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    pb.collection("bookmarks")
      .getFullList({ filter: `household.id="${householdId}"`, sort: "created" })
      .then((r) => setBookmarks(r as unknown as Bookmark[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [householdId]);

  useEffect(() => {
    if (!membership) return;
    const h = Array.isArray(membership.hidden_bookmarks) ? (membership.hidden_bookmarks as string[]) : [];
    setBmHidden(h);
  }, [membership?.id]);

  async function save() {
    if (!form || !householdId || !form.name.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      const payload = {
        household: householdId,
        name: form.name.trim(),
        url: form.url.trim(),
        emoji: form.emoji.trim() || null,
        description: form.description.trim() || null,
        visibility: form.visibility,
        created_by: form.visibility === "me" ? (user?.id ?? null) : null,
      };
      if (form.id) {
        const updated = await pb.collection("bookmarks").update(form.id, payload);
        setBookmarks((prev) => prev.map((b) => b.id === form.id ? updated as unknown as Bookmark : b));
      } else {
        const created = await pb.collection("bookmarks").create(payload);
        setBookmarks((prev) => [...prev, created as unknown as Bookmark]);
      }
      setForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this bookmark?")) return;
    await pb.collection("bookmarks").delete(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  async function toggleHide(id: string) {
    if (!membership) return;
    const next = bmHidden.includes(id) ? bmHidden.filter((x) => x !== id) : [...bmHidden, id];
    setBmHidden(next);
    await pb.collection("memberships").update(membership.id, { hidden_bookmarks: next });
  }

  const myBookmarks = bookmarks.filter((b) => b.visibility !== "me" || b.created_by === user?.id);
  const visible = myBookmarks.filter((b) => !bmHidden.includes(b.id));
  const hidden = myBookmarks.filter((b) => bmHidden.includes(b.id));
  const formFavicon = form?.url ? faviconUrl(form.url) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <button
          onClick={() => setForm({ name: "", url: "", emoji: "", description: "", visibility: "all" })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add bookmark
        </button>
      </div>

      {/* Add / edit form */}
      {form && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-sm">{form.id ? "Edit bookmark" : "New bookmark"}</h2>
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-xl border border-input bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {form.emoji.trim() ? (
                <span className="text-2xl">{form.emoji}</span>
              ) : formFavicon ? (
                <img src={formFavicon} alt="" className="h-8 w-8 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <span className="text-2xl">🔖</span>
              )}
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
            />
          </div>
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://… (icon auto-detected from URL)"
            type="url"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            placeholder="Emoji override (optional)"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Notes / credentials (hidden by default, revealed with 👁 button)"
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Visible to</p>
              <div className="flex rounded-xl border border-input overflow-hidden text-sm font-medium">
                <button
                  onClick={() => setForm({ ...form, visibility: "all" })}
                  className={cn("px-4 py-2 transition-colors", form.visibility === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                >
                  All household
                </button>
                <button
                  onClick={() => setForm({ ...form, visibility: "me" })}
                  className={cn("px-4 py-2 transition-colors border-l border-input", form.visibility === "me" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                >
                  Just me
                </button>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => setForm(null)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.url.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && visible.length === 0 && !form && (
        <p className="text-sm text-muted-foreground">No bookmarks yet. Add shortcuts to Gmail, Xero, your travel planner — anything you open regularly.</p>
      )}

      {/* Visible bookmarks grid */}
      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {visible.map((bm) => {
            const revealed = reveal.has(bm.id);
            return (
              <div key={bm.id} className="relative group/bm">
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors text-center"
                >
                  <BookmarkIcon bm={bm} />
                  <span className="text-sm font-semibold leading-tight">{bm.name}</span>
                  {bm.visibility === "me" && (
                    <span className="text-[10px] text-muted-foreground">Only me</span>
                  )}
                  <ExternalLink className="h-3 w-3 text-muted-foreground/50 mt-auto" />
                </a>

                {/* Hover controls */}
                <div className="absolute -top-2 -right-2 hidden group-hover/bm:flex gap-1">
                  {bm.description && (
                    <button
                      onClick={() => setReveal((prev) => { const s = new Set(prev); s.has(bm.id) ? s.delete(bm.id) : s.add(bm.id); return s; })}
                      title={revealed ? "Hide notes" : "Show notes"}
                      className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                    >
                      {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  )}
                  <button
                    onClick={() => setForm({ id: bm.id, name: bm.name, url: bm.url, emoji: bm.emoji ?? "", description: bm.description ?? "", visibility: bm.visibility })}
                    title="Edit"
                    className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {bm.visibility === "all" && (
                    <button
                      onClick={() => toggleHide(bm.id)}
                      title="Hide for me"
                      className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-amber-500 shadow-sm"
                    >
                      <EyeOff className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => del(bm.id)}
                    title="Delete"
                    className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-destructive shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Description reveal */}
                {revealed && bm.description && (
                  <div className="mt-2 p-3 rounded-xl bg-muted border border-border text-xs whitespace-pre-wrap break-words">
                    {bm.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden bookmarks */}
      {hidden.length > 0 && (
        <div>
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-3"
          >
            <Eye className="h-4 w-4" />
            {showHidden ? "Hide" : `Show ${hidden.length} hidden bookmark${hidden.length !== 1 ? "s" : ""}`}
          </button>
          {showHidden && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 opacity-50">
              {hidden.map((bm) => (
                <div key={bm.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-dashed border-border text-center">
                  <BookmarkIcon bm={bm} />
                  <span className="text-sm font-medium leading-tight">{bm.name}</span>
                  <button
                    onClick={() => toggleHide(bm.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Unhide
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
