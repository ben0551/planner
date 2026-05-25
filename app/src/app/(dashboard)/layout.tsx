"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { getClient } from "@/lib/pocketbase";
import { randomUUID } from "@/lib/utils";
import { makeSlug } from "@/lib/db-setup";
import { Nav } from "@/components/nav";
import { PwaInit } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, setupRequired, householdStatus, householdMode, logout, refreshMembership } = useAuth();
  const router = useRouter();

  const [householdName, setHouseholdName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!loading && !user && householdMode === "single") {
      router.replace("/login");
    }
  }, [user, loading, householdMode, router]);

  async function createHousehold() {
    if (!user) return;
    setCreating(true);
    setCreateError("");
    try {
      const pb = getClient();
      const hhName = householdName.trim() || `${(user.name as string).split(" ")[0]}'s Home`;
      const household = await pb.collection("households").create({
        name: hhName,
        invite_token: randomUUID(),
        slug: makeSlug(hhName),
      });
      await pb.collection("memberships").create({
        user: user.id,
        household: household.id,
        role: "owner",
      });
      refreshMembership();
    } catch (err: any) {
      setCreateError(err?.message ?? "Failed to create household.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!user && householdMode === "multi") {
    return <MultiLandingPage />;
  }

  if (!user) return null;

  if (householdStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 text-center">
          <div className="text-4xl">⏳</div>
          <h1 className="text-lg font-bold">Awaiting approval</h1>
          <p className="text-sm text-muted-foreground">
            Your household has been created and is waiting for the admin to approve it. Check back soon.
          </p>
          <button onClick={logout} className="text-xs text-muted-foreground hover:underline">Sign out</button>
        </div>
      </div>
    );
  }

  if (householdStatus === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 text-center">
          <div className="text-4xl">🚫</div>
          <h1 className="text-lg font-bold">Access not approved</h1>
          <p className="text-sm text-muted-foreground">
            Your household registration was not approved. Contact the admin if you think this is a mistake.
          </p>
          <button onClick={logout} className="text-xs text-muted-foreground hover:underline">Sign out</button>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-bold">Create your household</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your account exists but isn't linked to a household yet. Give it a name to get started.
            </p>
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <Input
            placeholder={`${(user.name as string).split(" ")[0]}'s Home`}
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
          />
          <Button onClick={createHousehold} disabled={creating}>
            {creating ? "Creating…" : "Create household"}
          </Button>
          <button onClick={logout} className="text-xs text-muted-foreground hover:underline text-center">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    /* Mobile: normal document flow (header sticky, bottom nav fixed)
       Desktop: full-viewport flex row; sidebar + content each scroll independently */
    <div className="flex flex-col md:flex-row md:h-screen bg-muted/30">
      <PwaInit />
      <Nav />
      <main className="flex-1 min-w-0 px-4 py-6 pb-24 md:pb-8 md:px-8 md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function MultiLandingPage() {
  const router = useRouter();
  const [slugInput, setSlugInput] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 gap-10">
      <div className="text-center">
        <p className="text-4xl mb-2">✨</p>
        <h1 className="text-3xl font-black tracking-tight">Planner</h1>
        <p className="text-muted-foreground mt-1 text-sm">Private household planning for your family.</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <Button className="w-full rounded-xl" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button variant="outline" className="w-full rounded-xl" asChild>
          <Link href="/register">Create a household</Link>
        </Button>

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
          <div className="relative flex justify-center"><span className="bg-muted/30 px-2 text-xs text-muted-foreground">I&apos;m a kid</span></div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); const s = slugInput.trim(); if (s) router.push(`/${s}`); }}
          className="flex gap-2"
        >
          <Input
            placeholder="Family URL (e.g. fischer9x2)"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
            className="rounded-xl flex-1 text-sm"
          />
          <Button type="submit" variant="outline" className="rounded-xl shrink-0" disabled={!slugInput.trim()}>
            Go
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">Ask a parent for your family URL.</p>
      </div>
    </div>
  );
}
