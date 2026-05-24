"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getClient, type Membership, type CachedMember, type PagePermission, type Permissions } from "@/lib/pocketbase";
import { applyTheme } from "@/lib/themes";
import type { RecordModel } from "pocketbase";

interface AuthContextValue {
  user: RecordModel | null;
  membership: Membership | null;
  householdId: string | null;
  loading: boolean;
  setupRequired: boolean;
  isAdmin: boolean;
  householdStatus: string;
  logout: () => void;
  refreshMembership: () => void;
  updateMembershipTheme: (theme: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  membership: null,
  householdId: null,
  loading: true,
  setupRequired: false,
  isAdmin: false,
  householdStatus: "active",
  logout: () => {},
  refreshMembership: () => {},
  updateMembershipTheme: () => {},
});

function cacheHousehold(householdId: string, householdName: string, members: CachedMember[]) {
  try {
    localStorage.setItem("planner_household", JSON.stringify({ id: householdId, name: householdName }));
    localStorage.setItem("planner_members", JSON.stringify(members));
  } catch {}
}

function clearCache() {
  // Keep planner_household and planner_members so the family picker still
  // works after logout — they only contain names and emails, no credentials.
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pb = getClient();
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [membershipTick, setMembershipTick] = useState(0);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_, record) => {
      setUser(record);
      if (!record) setMembership(null);
    });
    return () => unsub();
  }, [pb]);

  function refreshMembership() {
    setMembershipTick((t) => t + 1);
  }

  function updateMembershipTheme(theme: string) {
    setMembership((prev) => prev ? { ...prev, theme } : prev);
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setSetupRequired(false);
      return;
    }

    async function fetchMembership() {
      let m: any;
      try {
        m = await pb
          .collection("memberships")
          .getFirstListItem(`user="${user!.id}"`, { expand: "household" });
      } catch {
        setMembership(null);
        setSetupRequired(true);
        return;
      }

      setSetupRequired(false);
      const typed = m as unknown as Membership;
      setMembership(typed);
      applyTheme(typed.theme);

      // Cache household + members list so the family login picker works offline
      const householdId = typed.household;
      const householdName = typed.expand?.household?.name ?? "";
      const allMembers = await pb.collection("memberships").getFullList({
        filter: `household="${householdId}"`,
        expand: "user",
      });
      const cached: CachedMember[] = allMembers.map((mem: any) => {
        const avatarFile = mem.expand?.user?.avatar as string | undefined;
        const uid = mem.expand?.user?.id ?? mem.user;
        return {
          membershipId: mem.id,
          userId: uid as string,
          name: (mem.expand?.user?.name as string) ?? "Unknown",
          email: (mem.expand?.user?.email as string) ?? "",
          role: mem.role as string,
          hasPin: Boolean(mem.pin),
          permissions: mem.permissions as Permissions | undefined,
          theme: mem.theme as string | undefined,
          avatarUrl: avatarFile
            ? `/pb/api/files/users/${uid}/${avatarFile}`
            : undefined,
        };
      });
      cacheHousehold(householdId, householdName, cached);
    }

    fetchMembership().finally(() => setLoading(false));
  }, [user, pb, membershipTick]);

  function logout() {
    pb.authStore.clear();
    clearCache();
    applyTheme(undefined); // reset to default violet
  }

  const isAdmin = Boolean(
    user?.email && process.env.NEXT_PUBLIC_ADMIN_EMAIL && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
  );
  const householdStatus = membership?.expand?.household?.status || "active";

  return (
    <AuthContext.Provider
      value={{
        user,
        membership,
        householdId: membership?.household ?? null,
        loading,
        setupRequired,
        isAdmin,
        householdStatus,
        logout,
        refreshMembership,
        updateMembershipTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function usePermission(page: keyof Permissions): PagePermission {
  const { membership } = useContext(AuthContext);
  if (!membership || membership.role === "owner") return "edit";
  return membership.permissions?.[page] ?? "read";
}
