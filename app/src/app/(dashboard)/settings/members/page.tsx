"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type CachedMember } from "@/lib/pocketbase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function childEmail(name: string, householdId: string) {
  return `${name.toLowerCase().replace(/\s+/g, "-")}-${householdId}@planner.local`;
}

function childPassword(householdId: string, pin: string) {
  return `planner-${householdId}-${pin}`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MembersPage() {
  const { householdId, membership } = useAuth();
  const pb = getClient();
  const [members, setMembers] = useState<CachedMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [childName, setChildName] = useState("");
  const [childPin, setChildPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOwner = membership?.role === "owner";

  useEffect(() => {
    if (!householdId) return;
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) =>
        setMembers(
          ms.map((m: any) => ({
            membershipId: m.id,
            userId: m.user as string,
            name: (m.expand?.user?.name as string) ?? "Unknown",
            email: (m.expand?.user?.email as string) ?? "",
            role: m.role as string,
            hasPin: Boolean(m.pin),
          }))
        )
      );
  }, [householdId]);

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
      });
      const newMember: CachedMember = {
        membershipId: m.id,
        userId: newUser.id,
        name: childName.trim(),
        email,
        role: "member",
        hasPin: true,
      };
      setMembers((prev) => [...prev, newMember]);

      // Update localStorage so the login picker shows the new child immediately
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
              The child will log in by tapping their name on the family screen and entering their PIN.
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
        {members.map((member) => (
          <div
            key={member.membershipId}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
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
          </div>
        ))}
      </div>
    </div>
  );
}
