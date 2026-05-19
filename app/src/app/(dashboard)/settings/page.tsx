"use client";

import { useAuth } from "@/context/auth";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Users, UserPlus, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const { user, membership } = useAuth();
  const router = useRouter();
  const household = membership?.expand?.household;
  const isOwner = membership?.role === "owner";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Household */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Household</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{household?.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            Your role: <Badge variant="secondary">{membership?.role}</Badge>
          </p>
        </div>
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Account</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{user?.name as string}</p>
          <p className="text-xs text-muted-foreground">{user?.email as string}</p>
        </div>
      </div>

      {/* Owner-only actions */}
      {isOwner && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden divide-y">
          <button
            onClick={() => router.push("/settings/members")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Members</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => router.push("/settings/invite")}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium">Invite member</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
