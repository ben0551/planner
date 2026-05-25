"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import Link from "next/link";
import { getClient, type CachedMember } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CachedHousehold {
  id: string;
  name: string;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function childPassword(householdId: string, pin: string) {
  return `planner-${householdId}-${pin}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { householdMode } = useAuth();
  const [mode, setMode] = useState<"family" | "email" | "lookup">("email");
  const [slugInput, setSlugInput] = useState("");
  const [household, setHousehold] = useState<CachedHousehold | null>(null);
  const [members, setMembers] = useState<CachedMember[]>([]);
  const [selected, setSelected] = useState<CachedMember | null>(null);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [lookupResults, setLookupResults] = useState<Array<{ id: string; name: string; members: CachedMember[] }>>([]);
  const [kidLoading, setKidLoading] = useState(false);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("planner_household") ?? "null") as CachedHousehold | null;
      const m = JSON.parse(localStorage.getItem("planner_members") ?? "[]") as CachedMember[];
      if (h && m.length > 0) {
        setHousehold(h);
        setMembers(m);
        setMode("family");
      }
    } catch {}
  }, []);

  async function handleEmailLogin() {
    setError("");
    setLoading(true);
    try {
      await getClient().collection("users").authWithPassword(email, password);
      router.push("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePinLogin() {
    if (!selected || pin.length !== 4 || !household) return;
    setError("");
    setLoading(true);
    try {
      await getClient().collection("users").authWithPassword(
        selected.email,
        childPassword(household.id, pin)
      );
      router.push("/");
    } catch {
      setError("Incorrect PIN. Try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function pickMember(member: CachedMember) {
    if (!member.hasPin) {
      setMode("email");
      setEmail(member.email);
      setError("Please sign in with your email and password.");
    } else {
      setSelected(member);
      setPin("");
      setError("");
    }
  }

  async function kidLogin() {
    setKidLoading(true);
    setError("");
    try {
      const res = await fetch("/api/household-lookup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
      const found: Array<{ id: string; name: string; members: CachedMember[] }> = data.households ?? [];
      if (found.length === 0) {
        setError("No kids found. Add a child account in Settings → Members first.");
        return;
      }
      if (found.length === 1) {
        selectHousehold(found[0]);
      } else {
        setLookupResults(found);
        setMode("lookup");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load family.");
    } finally {
      setKidLoading(false);
    }
  }

  function selectHousehold(h: { id: string; name: string; members: CachedMember[] }) {
    setHousehold({ id: h.id, name: h.name });
    setMembers(h.members);
    try {
      localStorage.setItem("planner_household", JSON.stringify({ id: h.id, name: h.name }));
      localStorage.setItem("planner_members", JSON.stringify(h.members));
    } catch {}
    setMode("family");
    setLookupResults([]);
  }

  // ── Family picker ─────────────────────────────────────────────────────────
  if (mode === "family" && household) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Planner</CardTitle>
            <CardDescription>{household.name} — who are you?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {!selected ? (
              <div className="grid grid-cols-3 gap-3">
                {members.map((member) => (
                  <button
                    key={member.userId}
                    onClick={() => pickMember(member)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-sm">{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-center leading-tight">
                      {member.name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handlePinLogin(); }} className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-base">{initials(selected.name)}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{selected.name.split(" ")[0]}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pin" className="text-center">Enter PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="text-center text-2xl tracking-[0.5em] h-12"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={loading || pin.length !== 4}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setSelected(null); setPin(""); setError(""); }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <button
              onClick={() => { setMode("email"); setError(""); }}
              className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              Sign in with email instead
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Household picker (multiple households found) ─────────────────────────
  if (mode === "lookup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Which family?</CardTitle>
            <CardDescription>Tap your household to sign in.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {lookupResults.map((h) => (
              <button
                key={h.id}
                onClick={() => selectHousehold(h)}
                className="text-left rounded-xl border px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.members.length} kid{h.members.length !== 1 ? "s" : ""}</p>
              </button>
            ))}
          </CardContent>
          <CardFooter>
            <button
              onClick={() => { setMode("email"); setLookupResults([]); }}
              className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
            >
              ← Sign in with email instead
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Email login ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Planner</CardTitle>
          <CardDescription>Sign in to your household</CardDescription>
        </CardHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleEmailLogin(); }}>
          <CardContent className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            {householdMode === "multi" ? (
              <form
                onSubmit={(e) => { e.preventDefault(); const s = slugInput.trim(); if (s) router.push(`/${s}`); }}
                className="flex gap-2"
              >
                <input
                  placeholder="Family URL (e.g. fischer9x2)"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!slugInput.trim()}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-40"
                >
                  Go
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={kidLogin}
                disabled={kidLoading}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                {kidLoading ? "Finding family…" : "I'm a kid — find my family"}
              </button>
            )}
            {household && (
              <button
                type="button"
                onClick={() => { setMode("family"); setError(""); }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to {household.name}
              </button>
            )}
            <p className="text-sm text-muted-foreground text-center">
              No account?{" "}
              <Link href="/register" className="underline underline-offset-4">
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
