import PocketBase from "pocketbase";

// Singleton for client-side usage
let pb: PocketBase;

export function getClient(): PocketBase {
  if (!pb) {
    // Proxy through Next.js (/pb/* rewrite in next.config.ts) so the app works
    // on any host without baking a URL into the build.
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/pb`
        : (process.env.PB_INTERNAL_URL ?? "http://localhost:8090");
    pb = new PocketBase(url);
    pb.autoCancellation(false);
  }
  return pb;
}

// Permission types
export type PagePermission = "none" | "read" | "edit";

export interface Permissions {
  chores: PagePermission;
  meals: PagePermission;
  shopping: PagePermission;
  calendar: PagePermission;
  rewards: PagePermission;
}

export const DEFAULT_CHILD_PERMISSIONS: Permissions = {
  chores: "read",
  meals: "edit",
  shopping: "edit",
  calendar: "read",
  rewards: "read",
};

// Types matching our PocketBase collections
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Household {
  id: string;
  name: string;
  invite_token: string;
  slug?: string;
  custody_week?: "odd" | "even" | "";
  week_start?: "mon" | "sun";
  kids_can_check_shopping?: boolean;
  status?: "active" | "pending" | "rejected" | "";
}

export interface AppSettings {
  id: string;
  allow_signups: boolean;
  require_approval: boolean;
}

export interface Membership {
  id: string;
  user: string;
  household: string;
  role: "owner" | "member";
  pin?: string;
  permissions?: Permissions;
  theme?: string;
  balance?: number;
  points_per_dollar?: number;
  converted_points?: number;
  expand?: { household?: Household; user?: User };
}

export interface CachedMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  hasPin: boolean;
  permissions?: Permissions;
  theme?: string;
  avatarUrl?: string;
}

export interface Chore {
  id: string;
  household: string;
  title: string;
  type: "single" | "everyone" | "shared";
  scope?: "all" | "kids";
  assignee?: string;
  recurrence: "none" | "daily" | "weekly" | "my_week" | "odd_week" | "even_week" | "fortnightly" | "monthly";
  due_date?: string;
  completed: boolean;
  points: number;
  deadline_time?: string;
  days?: string; // comma-separated JS day numbers, e.g. "1,2,3,4,5" for Mon–Fri
  expand?: { assignee?: User };
}

export interface ChoreCompletion {
  id: string;
  chore: string;
  user: string;
  date: string;
  points: number;
}

export interface Meal {
  id: string;
  household: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "extras";
  recipe_name: string;
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  household: string;
  name: string;
  quantity?: string;
  category?: string;
  checked: boolean;
  meal?: string;
  meal_note?: string;
  added_by?: string;
  good_price?: string;
  list?: string;
}

export interface ShoppingList {
  id: string;
  household: string;
  name: string;
  archived: boolean;
  archived_at?: string;
  created: string;
}

export interface ShoppingCatalog {
  id: string;
  household: string;
  name: string;
  category?: string;
  good_price?: string;
}

export interface Goal {
  id: string;
  household: string;
  user: string;
  users?: string[];  // shared goal: array of 2 user IDs; combined points count toward target
  title: string;
  emoji?: string;
  target_points: number;
  reward_description?: string;
  achieved: boolean;
  private?: boolean;
}

export interface MealRecipe {
  id: string;
  household: string;
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "extras";
  category?: string;
  notes?: string;
  ingredients?: string;
  url?: string;
}

export interface CalendarEvent {
  id: string;
  household: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  source: "manual" | "google" | "outlook";
  external_id?: string;
  notes?: string;
  recurrence?: "none" | "daily" | "weekly" | "fortnightly" | "monthly" | "yearly";
  recurrence_until?: string;
}

export interface Task {
  id: string;
  household: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  notes?: string;
  completed: boolean;
  assigned_to?: string;
  created_by?: string;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  last_completed?: string;
  expand?: { assigned_to?: User; created_by?: User };
}

export interface Note {
  id: string;
  household: string;
  user?: string;
  content: string;
  color?: string;
  pinned?: boolean;
  created: string;
}

export interface BalanceTransaction {
  id: string;
  household: string;
  membership: string;
  amount: number;
  description?: string;
  type: "allowance" | "purchase" | "points_conversion";
  created: string;
}

export interface ActivityEntry {
  id: string;
  household: string;
  user?: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  created: string;
  expand?: { user?: { id: string; name: string } };
}
