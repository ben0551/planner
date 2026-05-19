"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import {
  getClient, type CachedMember, type PagePermission, type Permissions, DEFAULT_CHILD_PERMISSIONS,
} from "@/lib/pocketbase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

function childEmail(name: string, householdId: string) {
  return `${name.toLowerCase().replace(/\s+/g, "-")}-${householdId}@planner.local`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const PAGES: { key: keyof Permissions; label: string; emoji: string }[] = [
  { key: "chores",   label: "Chores",        emoji: "✅" },
  { key: "meals",    label: "Meal Planner",  emoji: "🍽️" },
  { key: "shopping", label: "Shopping List", emoji: "🛒" },
  { key: "calendar", label: "Calendar",      emoji: "📅" },
  { key: "rewards",  label: "Rewards",       emoji: "🏆" },
];

const LEVELS: { value: PagePermission; label: string }[] = [
  { value: "none", label: "Hidden" },
  { value: "read", label: "View" },
  { value: "edit", label: "Edit" },
];

function PermissionToggle({
  value,
  onChange,
}: {
  value: PagePermission;
  onChange: (v: PagePermission) => void;
}) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-border">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          className={cn(
            "flex-1 px-2 py-1.5 text-[11px] font-bold transition-colors",
            value === level.value
              ? level.value === "none"
                ? "bg-muted-foreground text-white"
                : level.value === "read"
                  ? "bg-primary/20 text-primary"
                  : "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

type MemberWithPerms = CachedMember & { permissions: Permissions };

function expandedPermissions(m: CachedMember): MemberWithPerms {
  return { ...m, permissions: { ...DEFAULT_CHILD_PERMISSIONS, ...m.permissions } };
}

function childPassword(householdId: string, pin: string) {
  return `planner-${householdId}-${pin}`;
}

export default function MembersPage() {
  const { householdId, membership } = useAuth();
  const pb = getClient();
  const [members, setMembers] = useState<MemberWithPerms[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [childPin, setChildPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pinReset, setPinReset] = useState<Record<string, string>>({}); // membershipId → new PIN
  const [pinSaving, setPinSaving] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const isOwner = membership?.role === "owner";

  useEffect(() => {
    if (!householdId) return;
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) =>
        setMembers(
          ms.map((m: any) =>
            expandedPermissions({
              membershipId: m.id,
              userId: m.expand?.user?.id ?? m.user,
              name: (m.expand?.user?.name as string) ?? "Unknown",
              email: (m.expand?.user?.email as string) ?? "",
              role: m.role as string,
              hasPin: Boolean(m.pin),
              permissions: m.permissions,
            })
          )
        )
      );
  }, [householdId]);

  function updateLocalPermission(membershipId: string, page: keyof Permissions, value: PagePermission) {
    setMembers((prev) =>
      prev.map((m) =>
        m.membershipId === membershipId
          ? { ...m, permissions: { ...m.permissions, [page]: value } }
          : m
      )
    );
  }

  async function resetPin(member: MemberWithPerms) {
    const newPin = pinReset[member.membershipId] ?? "";
    if (newPin.length !== 4 || !householdId) return;
    setPinSaving(member.membershipId);
    try {
      const res = await fetch("/api/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.userId,
          membershipId: member.membershipId,
          householdId,
          newPin,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to reset PIN.");
      }
      setPinReset(prev => ({ ...prev, [member.membershipId]: "" }));
      setPinSuccess(member.membershipId);
      setTimeout(() => setPinSuccess(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset PIN.");
    } finally {
      setPinSaving(null);
    }
  }

  async function savePermissions(member: MemberWithPerms) {
    setSaving(member.membershipId);
    try {
      await pb.collection("memberships").update(member.membershipId, {
        permissions: member.permissions,
      });
    } finally {
      setSaving(null);
    }
  }

  async function addChild() {
    if (!childName.trim() || childPin.length !== 4 || !householdId) return;
    setError("");
    setLoading(true);
    try {
      const email = childEmail(childName.trim(), householdId);
      const password = childPassword(householdId, childPin);
      const newUser = await pb.collection("users").create({
        name: childName.trim(),
        email,
        password,
        passwordConfirm: password,
      });
      const m = await pb.collection("memberships").create({
        user: newUser.id,
        household: householdId,
        role: "member",
        pin: childPin,
        permissions: DEFAULT_CHILD_PERMISSIONS,
      });
      const newMember = expandedPermissions({
        membershipId: m.id,
        userId: newUser.id,
        name: childName.trim(),
        email,
        role: "member",
        hasPin: true,
        permissions: DEFAULT_CHILD_PERMISSIONS,
      });
      setMembers((prev) => [...prev, newMember]);

      try {
        const existing = JSON.parse(localStorage.getItem("planner_members") ?? "[]") as CachedMember[];
        localStorage.setItem("planner_members", JSON.stringify([...existing, newMember]));
      } catch {}

      setChildName("");
      setChildPin("");
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        {isOwner && (
          <Button
            size="sm"
            variant={showForm ? "secondary" : "default"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "+ Add child"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add child account</CardTitle>
            <CardDescription>
              The child will log in by tapping their name and entering their PIN.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-1">
              <Label htmlFor="child-name">Child's name</Label>
              <Input
                id="child-name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Alice"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="child-pin">4-digit PIN</Label>
              <Input
                id="child-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={childPin}
                onChange={(e) => setChildPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="text-center tracking-widest"
              />
            </div>
            <Button
              onClick={addChild}
              disabled={loading || !childName.trim() || childPin.length !== 4}
            >
              {loading ? "Creating…" : "Create account"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {members.map((member) => {
          const isExpanded = expanded === member.membershipId;
          const isChild = member.hasPin;
          return (
            <div key={member.membershipId} className="rounded-2xl border bg-card overflow-hidden">
              {/* Member row */}
              <div
                className={cn("flex items-center gap-3 p-3", isOwner && isChild && "cursor-pointer hover:bg-muted/30 transition-colors")}
                onClick={() => isOwner && isChild && setExpanded(isExpanded ? null : member.membershipId)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.hasPin ? "PIN login" : member.email}
                  </p>
                </div>
                <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
                {isOwner && isChild && (
                  isExpanded
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {/* Permission editor */}
              {isExpanded && isChild && (
                <div className="border-t px-4 py-3 flex flex-col gap-3">
                  {/* PIN reset */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <KeyRound className="h-3 w-3" /> Reset PIN
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="New PIN"
                        value={pinReset[member.membershipId] ?? ""}
                        onChange={e => setPinReset(prev => ({
                          ...prev,
                          [member.membershipId]: e.target.value.replace(/\D/g, "").slice(0, 4),
                        }))}
                        className="w-28 text-center tracking-widest"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={
                          (pinReset[member.membershipId] ?? "").length !== 4 ||
                          pinSaving === member.membershipId
                        }
                        onClick={() => resetPin(member)}
                      >
                        {pinSaving === member.membershipId
                          ? "Saving…"
                          : pinSuccess === member.membershipId
                            ? "✓ Done!"
                            : "Set PIN"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Page access</p>
                  <div className="flex flex-col gap-2.5">
                    {PAGES.map((page) => (
                      <div key={page.key} className="flex items-center gap-3">
                        <span className="text-base w-6 text-center shrink-0">{page.emoji}</span>
                        <span className="text-sm font-medium w-28 shrink-0">{page.label}</span>
                        <div className="flex-1">
                          <PermissionToggle
                            value={member.permissions[page.key]}
                            onChange={(v) => updateLocalPermission(member.membershipId, page.key, v)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="self-end rounded-xl"
                    disabled={saving === member.membershipId}
                    onClick={() => savePermissions(member)}
                  >
                    {saving === member.membershipId ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
