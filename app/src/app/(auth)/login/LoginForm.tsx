"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export function LoginForm({ isMulti }: { isMulti: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"family" | "email">("email");
  const [household, setHousehold] = useState<CachedHousehold | null>(null);
  const [members, setMembers] = useState<CachedMember[]>([]);
  const [selected, setSelected] = useState<CachedMember | null>(null);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // isMulti is known synchronously from the server — no async fetch needed.
    // In multi mode, /login always shows the email form regardless of localStorage.
    if (isMulti) return;
    try {
      const h = JSON.parse(localStorage.getItem("planner_household") ?? "null") as CachedHousehold | null;
      const m = JSON.parse(localStorage.getItem("planner_members") ?? "[]") as CachedMember[];
      if (h && m.length > 0) {
        setHousehold(h);
        setMembers(m);
        setMode("family");
      }
    } catch {}
  }, [isMulti]);

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
      const res = await fetch("/api/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: selected.membershipId, pin, householdId: household.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Incorrect PIN.");
      getClient().authStore.save(data.token, data.record);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect PIN. Try again.");
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

  // ── Family picker (cached, no network call) ───────────────────────────────
  if (!isMulti && mode === "family" && household) {
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
            {!isMulti && household && (
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
