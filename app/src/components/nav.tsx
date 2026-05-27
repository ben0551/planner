"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, usePermission } from "@/context/auth";
import type { Permissions } from "@/lib/pocketbase";
import { getTheme, getDynamicGradient, getDynamicPrimary } from "@/lib/themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Home,
  ListChecks,
  ShoppingCart,
  UtensilsCrossed,
  CalendarDays,
  Settings,
  LogOut,
  Trophy,
  ClipboardList,
  StickyNote,
  TrendingUp,
  ShieldCheck,
  Heart,
} from "lucide-react";

const navItems = [
  { href: "/",          label: "Today",        icon: Home,            emoji: "🏠" },
  { href: "/chores",    label: "Chores",        icon: ListChecks,      emoji: "✅" },
  { href: "/progress",  label: "Progress",      icon: TrendingUp,      emoji: "📊" },
  { href: "/rewards",   label: "Rewards",       icon: Trophy,          emoji: "🏆" },
  { href: "/shopping",  label: "Shopping List", icon: ShoppingCart,    emoji: "🛒" },
  { href: "/calendar",  label: "Calendar",      icon: CalendarDays,    emoji: "📅" },
  { href: "/meals",     label: "Meal Planner",  icon: UtensilsCrossed, emoji: "🍽️" },
  { href: "/tasks",     label: "Tasks",         icon: ClipboardList,   emoji: "📋" },
  { href: "/notes",     label: "Notes",         icon: StickyNote,      emoji: "📝" },
  { href: "/settings",  label: "Settings",      icon: Settings,        emoji: "⚙️" },
];

const mobileNav = navItems.slice(0, 6);

// Maps nav href to the permissions key it requires (undefined = always visible)
const PAGE_PERMISSION_KEY: Record<string, keyof Permissions | undefined> = {
  "/chores":   "chores",
  "/meals":    "meals",
  "/shopping": "shopping",
  "/calendar": "calendar",
  "/rewards":  "rewards",
};

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, membership, isAdmin, logout, householdMode } = useAuth();
  const theme = getTheme(membership?.theme);

  const [liveGradient, setLiveGradient] = useState(theme.gradient);
  useEffect(() => {
    if (theme.name === "dynamic") {
      const tick = () => {
        setLiveGradient(getDynamicGradient());
        const p = getDynamicPrimary();
        document.documentElement.style.setProperty("--primary", p);
        document.documentElement.style.setProperty("--ring", p);
      };
      tick();
      const id = setInterval(tick, 60_000);
      return () => clearInterval(id);
    }
    if (theme.name === "custom") {
      const bg = membership?.custom_bg_image
        ? `linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)), url("/pb/api/files/memberships/${membership.id}/${membership.custom_bg_image}") center / cover no-repeat`
        : membership?.custom_gradient || theme.gradient;
      setLiveGradient(bg);
      if (membership?.custom_primary) {
        document.documentElement.style.setProperty("--primary", membership.custom_primary);
        document.documentElement.style.setProperty("--ring", membership.custom_primary);
      }
      return;
    }
    setLiveGradient(theme.gradient);
  }, [theme.name, theme.gradient, membership?.custom_bg_image, membership?.custom_gradient, membership?.custom_primary, membership?.id]);

  function canSee(href: string): boolean {
    const key = PAGE_PERMISSION_KEY[href];
    if (!key) return true; // no restriction (home, settings)
    if (membership?.role === "owner") return true;
    const perm = membership?.permissions?.[key] ?? "read";
    return perm !== "none";
  }

  const initials = (user?.name as string | undefined)
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 overflow-y-auto"
        style={{ background: liveGradient }}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <span className="font-black text-xl tracking-tight text-white">✨ Planner</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
          {navItems.filter((item) => canSee(item.href)).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                  active
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-violet-100 hover:text-white hover:bg-white/15"
                )}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin link */}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
              pathname === "/admin"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-violet-100 hover:text-white hover:bg-white/15"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}

        {/* User section */}
        <div className="px-3 py-4 mt-2 border-t border-white/20 flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white/40">
              <AvatarFallback className="text-xs bg-white/20 text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name as string}</p>
              <p className="text-[11px] text-violet-200 truncate">{membership?.expand?.household?.name}</p>
              {householdMode === "multi" && membership?.role === "owner" && membership?.expand?.household?.slug && (
                <p className="text-[10px] text-violet-300/80 truncate font-mono">
                  /{membership.expand.household.slug}
                </p>
              )}
            </div>
          </div>
          {membership?.role === "owner" && (
            <a
              href="https://paypal.me/Fischerbenjamin?locale.x=en_AU&country.x=AU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-pink-300 hover:text-white hover:bg-white/15 transition-colors font-medium"
            >
              <Heart className="h-4 w-4 shrink-0 fill-pink-400 text-pink-400" />
              Buy me a coffee ☕
            </a>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-violet-200 hover:text-white hover:bg-white/15 transition-colors w-full text-left font-medium"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <header
        className="md:hidden flex items-center justify-between px-4 h-13 sticky top-0 z-40"
        style={{ background: liveGradient.replace("175deg", "90deg") }}
      >
        <span className="font-black text-base tracking-tight text-white">✨ Planner</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 ring-white/60 cursor-pointer">
            <Avatar className="h-8 w-8 ring-2 ring-white/40">
              <AvatarFallback className="text-xs bg-white/25 text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm">
              <p className="font-bold">{user?.name as string}</p>
              <p className="text-muted-foreground text-xs truncate">{user?.email as string}</p>
              {householdMode === "multi" && membership?.role === "owner" && membership?.expand?.household?.slug && (
                <p className="text-muted-foreground text-xs font-mono">/{membership.expand.household.slug}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => router.push("/admin")}>Admin</DropdownMenuItem>
            )}
            {membership?.role === "owner" && (
              <>
                <DropdownMenuItem onClick={() => router.push("/settings/members")}>Members</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings/invite")}>Invite member</DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            {membership?.role === "owner" && (
              <DropdownMenuItem
                onClick={() => window.open("https://paypal.me/Fischerbenjamin?locale.x=en_AU&country.x=AU", "_blank", "noopener,noreferrer")}
                className="text-pink-500 font-medium cursor-pointer"
              >
                ☕ Buy me a coffee
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={logout} className="text-destructive font-medium">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Mobile bottom tab bar ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        {mobileNav.filter((item) => canSee(item.href)).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition-colors",
                active ? "text-violet-600" : "text-muted-foreground"
              )}
            >
              <span className={cn("text-xl leading-none", !active && "grayscale opacity-60")}>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
