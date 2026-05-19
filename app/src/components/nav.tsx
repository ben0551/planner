"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
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
} from "lucide-react";

const navItems = [
  { href: "/", label: "Today", icon: Home },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/meals", label: "Meal Planner", icon: UtensilsCrossed },
  { href: "/shopping", label: "Shopping List", icon: ShoppingCart },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/rewards", label: "Rewards", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobileNav = navItems.slice(0, 5); // Today, Chores, Shopping, Meals, Calendar

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, membership, logout } = useAuth();

  const initials = (user?.name as string | undefined)
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-white overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-5 border-b">
          <span className="font-extrabold text-lg tracking-tight text-primary">Planner</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t px-3 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user?.name as string}</p>
              <p className="text-[10px] text-muted-foreground truncate">{membership?.expand?.household?.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-muted/60 transition-colors w-full text-left"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 h-12 bg-white border-b sticky top-0 z-40">
        <span className="font-extrabold text-base tracking-tight text-primary">Planner</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 ring-ring cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm">
              <p className="font-medium">{user?.name as string}</p>
              <p className="text-muted-foreground text-xs truncate">{user?.email as string}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            {membership?.role === "owner" && (
              <>
                <DropdownMenuItem onClick={() => router.push("/settings/members")}>Members</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings/invite")}>Invite member</DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Mobile bottom tab bar ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "stroke-primary" : "stroke-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
