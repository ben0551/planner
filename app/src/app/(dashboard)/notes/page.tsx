"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Note } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTE_COLORS = [
  { bg: "bg-yellow-100", border: "border-yellow-200" },
  { bg: "bg-pink-100",   border: "border-pink-200" },
  { bg: "bg-sky-100",    border: "border-sky-200" },
  { bg: "bg-emerald-100",border: "border-emerald-200" },
  { bg: "bg-violet-100", border: "border-violet-200" },
  { bg: "bg-orange-100", border: "border-orange-200" },
];

function colorFor(color?: string) {
  return NOTE_COLORS.find((c) => c.bg === color) ?? NOTE_COLORS[0];
}

export default function NotesPage() {
  const { householdId, user } = useAuth();
  const pb = getClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].bg);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    pb.collection("notes")
      .getFullList<Note>({ filter: `household="${householdId}"`, sort: "-pinned,-created" })
      .then((items) => setNotes(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [householdId]);

  async function addNote() {
    if (!content.trim() || !householdId) return;
    setSaving(true);
    try {
      const rec = await pb.collection("notes").create({
        household: householdId,
        user: user?.id,
        content: content.trim(),
        color: selectedColor,
        pinned: false,
      });
      setNotes((prev) => [rec as unknown as Note, ...prev]);
      setContent("");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    await pb.collection("notes").delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function togglePin(note: Note) {
    const next = !note.pinned;
    await pb.collection("notes").update(note.id, { pinned: next });
    setNotes((prev) =>
      [...prev.map((n) => (n.id === note.id ? { ...n, pinned: next } : n))].sort(
        (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || a.created.localeCompare(b.created) * -1,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h1 className="text-2xl font-semibold">Notes</h1>

      {/* Add note form */}
      <div className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.bg}
                onClick={() => setSelectedColor(c.bg)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  c.bg,
                  selectedColor === c.bg ? "border-foreground scale-110" : "border-transparent",
                )}
              />
            ))}
          </div>
          <Button
            size="sm"
            className="ml-auto"
            disabled={saving || !content.trim()}
            onClick={addNote}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Notes grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {notes.map((note) => {
            const { bg, border } = colorFor(note.color);
            return (
              <div
                key={note.id}
                className={cn("relative rounded-2xl border p-3 flex flex-col gap-2 group", bg, border)}
              >
                <p className="text-sm whitespace-pre-wrap break-words flex-1">{note.content}</p>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => togglePin(note)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={note.pinned ? "Unpin" : "Pin"}
                  >
                    {note.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
