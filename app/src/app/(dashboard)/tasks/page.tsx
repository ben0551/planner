"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Task } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckSquare, Square, Trash2, Plus, X } from "lucide-react";

type Member = { id: string; name: string };
type Filter = "pending" | "completed" | "all";

function dueBadge(due: string, completed: boolean) {
  if (!due) return null;
  const today = new Date().toISOString().substring(0, 10);
  if (completed) return null;
  if (due < today) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
  if (due === today) return { label: "Due today", cls: "bg-amber-100 text-amber-700" };
  return null;
}

export default function TasksPage() {
  const { householdId, user, membership } = useAuth();
  const pb = getClient();
  const isOwner = membership?.role === "owner";
  const userId = user?.id ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [showForm, setShowForm] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    pb.collection("tasks")
      .getFullList({
        filter: `household="${householdId}"`,
        sort: "due_date,created",
        expand: "assigned_to,created_by",
      })
      .then((items) => setTasks(items as unknown as Task[]));
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) =>
        setMembers(
          ms.map((m: any) => ({
            id: m.expand?.user?.id ?? m.user,
            name: m.expand?.user?.name ?? "Member",
          })),
        ),
      );
  }, [householdId]);

  function isVisible(t: Task) {
    if (isOwner) return true;
    if (!t.assigned_to) return true; // unassigned = everyone sees it
    return t.assigned_to === userId || t.created_by === userId;
  }

  const visible = tasks.filter(isVisible);
  const filtered = visible.filter((t) =>
    filter === "all" ? true : filter === "pending" ? !t.completed : t.completed,
  );

  async function addTask() {
    if (!newTitle.trim() || !householdId) return;
    setSaving(true);
    try {
      const rec = await pb.collection("tasks").create({
        household: householdId,
        title: newTitle.trim(),
        due_date: newDue || undefined,
        notes: newNotes.trim() || undefined,
        assigned_to: newAssignee || undefined,
        created_by: userId,
        completed: false,
      });
      setTasks((prev) => [...prev, rec as unknown as Task]);
      setNewTitle(""); setNewDue(""); setNewNotes(""); setNewAssignee("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(t: Task) {
    const updated = await pb.collection("tasks").update(t.id, { completed: !t.completed });
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
  }

  async function deleteTask(id: string) {
    await pb.collection("tasks").delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const pendingCount = visible.filter((t) => !t.completed).length;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground">{pendingCount} pending</p>
          )}
        </div>
        <Button size="sm" variant={showForm ? "secondary" : "default"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Plus className="h-4 w-4 mr-1" /> Add task</>}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Book dentist appointment"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-assignee">Assign to (optional)</Label>
              <select
                id="task-assignee"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Everyone</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-notes">Notes (optional)</Label>
            <Input
              id="task-notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Any extra details…"
            />
          </div>
          <Button onClick={addTask} disabled={saving || !newTitle.trim()} className="self-start">
            {saving ? "Adding…" : "Add task"}
          </Button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 self-start">
        {(["pending", "completed", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
              filter === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {filter === "pending" ? "No pending tasks — nice work!" : "Nothing here."}
          </p>
        )}
        {filtered.map((t) => {
          const badge = dueBadge(t.due_date, t.completed);
          const assigneeName = t.expand?.assigned_to?.name;
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border bg-white shadow-sm px-4 py-3 group",
                t.completed && "opacity-60",
              )}
            >
              <button
                onClick={() => toggleComplete(t)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              >
                {t.completed ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", t.completed && "line-through")}>{t.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {t.due_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.due_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {badge && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", badge.cls)}>
                      {badge.label}
                    </span>
                  )}
                  {assigneeName && (
                    <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                      {assigneeName}
                    </span>
                  )}
                </div>
                {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
              </div>
              {(isOwner || t.created_by === userId) && (
                <button
                  onClick={() => deleteTask(t.id)}
                  className="hidden group-hover:flex shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
