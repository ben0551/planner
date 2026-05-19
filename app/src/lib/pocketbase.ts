import PocketBase from "pocketbase";

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://localhost:8090";

// Singleton for client-side usage
let pb: PocketBase;

export function getClient(): PocketBase {
  if (!pb) {
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
  custody_week?: "odd" | "even" | "";
}

export interface Membership {
  id: string;
  user: string;
  household: string;
  role: "owner" | "member";
  pin?: string;
  permissions?: Permissions;
  theme?: string;
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
  deadline_time?: string; // HH:MM, e.g. "20:00" — must complete by this time for full points
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
  meal_type: "breakfast" | "lunch" | "dinner";
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
}

export interface Goal {
  id: string;
  household: string;
  user: string;
  title: string;
  target_points: number;
  reward_description?: string;
  achieved: boolean;
  private?: boolean;
}

export interface MealRecipe {
  id: string;
  household: string;
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner";
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
}
