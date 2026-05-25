"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getClient, type CachedMember } from "@/lib/pocketbase";

async function pinLogin(membershipId: string, pin: string, householdId: string) {
  const res = await fetch("/api/pin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ membershipId, pin, householdId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Incorrect PIN.");
  getClient().authStore.save(data.token, data.record);
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}


export default function SlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [members, setMembers] = useState<CachedMember[]>([]);
  const [selected, setSelected] = useState<CachedMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/household-lookup?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        const h = data.households?.[0];
        if (!h) { setNotFound(true); return; }
        setHouseholdId(h.id);
        setHouseholdName(h.name);
        setMembers(h.members ?? []);
        if ((h.members ?? []).length === 0) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false));
  }, [slug]);

  async function handlePinLogin() {
    if (!selected || pin.length !== 4 || !householdId) return;
    setError("");
    setLoading(true);
    try {
      await pinLogin(selected.membershipId, pin, householdId);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect PIN. Try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Finding your family…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Family not found</CardTitle>
            <CardDescription>The URL <code className="text-xs bg-muted px-1 py-0.5 rounded">{slug}</code> doesn&apos;t match any household.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">Back to home</Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Planner</CardTitle>
          <CardDescription>{householdName} — who are you?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!selected ? (
            <div className="grid grid-cols-3 gap-3">
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => { setSelected(member); setPin(""); setError(""); }}
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
                <label htmlFor="pin" className="text-sm font-medium text-center">Enter PIN</label>
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
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground w-full text-center">
            Sign in with email instead
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
