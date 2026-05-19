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
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  membership: null,
  householdId: null,
  loading: true,
  logout: () => {},
});

function cacheHousehold(householdId: string, householdName: string, members: CachedMember[]) {
  try {
    localStorage.setItem("planner_household", JSON.stringify({ id: householdId, name: householdName }));
    localStorage.setItem("planner_members", JSON.stringify(members));
  } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem("planner_household");
    localStorage.removeItem("planner_members");
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pb = getClient();
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_, record) => {
      setUser(record);
      if (!record) setMembership(null);
    });
    return () => unsub();
  }, [pb]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchMembership() {
      const m = await pb
        .collection("memberships")
        .getFirstListItem(`user="${user!.id}"`, { expand: "household" });

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
      const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://localhost:8090";
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
            ? `${pbUrl}/api/files/users/${uid}/${avatarFile}`
            : undefined,
        };
      });
      cacheHousehold(householdId, householdName, cached);
    }

    fetchMembership()
      .catch(() => setMembership(null))
      .finally(() => setLoading(false));
  }, [user, pb]);

  function logout() {
    pb.authStore.clear();
    clearCache();
    applyTheme(undefined); // reset to default violet
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        membership,
        householdId: membership?.household ?? null,
        loading,
        logout,
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
