"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { getClient } from "@/lib/pocketbase";
import { randomUUID } from "@/lib/utils";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, setupRequired, refreshMembership, logout } = useAuth();
  const router = useRouter();

  const [householdName, setHouseholdName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  async function createHousehold() {
    if (!user) return;
    setCreating(true);
    setCreateError("");
    try {
      const pb = getClient();
      const household = await pb.collection("households").create({
        name: householdName.trim() || `${(user.name as string).split(" ")[0]}'s Home`,
        invite_token: randomUUID(),
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

  if (!user) return null;

  if (setupRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
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
      <Nav />
      <main className="flex-1 min-w-0 px-4 py-6 pb-24 md:pb-8 md:px-8 md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
