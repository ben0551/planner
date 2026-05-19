"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { Nav } from "@/components/nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return null;

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
