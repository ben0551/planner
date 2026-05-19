"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Meal, type MealRecipe } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BookOpen, Plus, Search } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner";

const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳" },
  { key: "lunch",     label: "Lunch",     emoji: "🥪" },
  { key: "dinner",    label: "Dinner",    emoji: "🍽️" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Editing { date: string; mealType: MealType }

export default function MealsPage() {
  const { householdId } = useAuth();
  const pb = getClient();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [recipeName, setRecipeName] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = toDateStr(new Date());

  useEffect(() => {
    if (!householdId) return;
    const from = toDateStr(weekStart);
    const to = toDateStr(addDays(weekStart, 6));
    pb.collection("meals")
      .getFullList({ filter: `household="${householdId}" && date >= "${from}" && date <= "${to}"` })
      .then((items) => setMeals(items as unknown as Meal[]));
    pb.collection("meal_recipes")
      .getFullList({ filter: `household="${householdId}"`, sort: "name" })
      .then((items) => setRecipes(items as unknown as MealRecipe[]));
  }, [householdId, weekStart]);

  function getMeal(dateStr: string, mealType: MealType): Meal | undefined {
    return meals.find((m) => m.date.startsWith(dateStr) && m.meal_type === mealType);
  }

  function openEdit(dateStr: string, mealType: MealType) {
    const meal = getMeal(dateStr, mealType);
    setRecipeName(meal?.recipe_name ?? "");
    setNotes(meal?.notes ?? "");
    setIngredients("");
    setSaveAsRecipe(false);
    setRecipeSearch("");
    setShowRecipePicker(false);
    setEditing({ date: dateStr, mealType });
  }

  function closeEdit() {
    setEditing(null);
    setRecipeName("");
    setNotes("");
    setIngredients("");
    setSaveAsRecipe(false);
    setShowRecipePicker(false);
  }

  function pickRecipe(recipe: MealRecipe) {
    setRecipeName(recipe.name);
    setNotes(recipe.notes ?? "");
    setIngredients(recipe.ingredients ?? "");
    setShowRecipePicker(false);
    setSaveAsRecipe(false);
  }

  async function saveMeal() {
    if (!editing || !recipeName.trim() || !householdId) return;
    setSaving(true);
    try {
      const existing = getMeal(editing.date, editing.mealType);
      if (existing) {
        const saved = await pb.collection("meals").update(existing.id, {
          recipe_name: recipeName.trim(),
          notes: notes.trim() || undefined,
        });
        setMeals((prev) => prev.map((m) => m.id === existing.id ? { ...m, ...saved } as Meal : m));
      } else {
        const saved = await pb.collection("meals").create({
          household: householdId,
          date: editing.date,
          meal_type: editing.mealType,
          recipe_name: recipeName.trim(),
          notes: notes.trim() || undefined,
        });
        setMeals((prev) => [...prev, saved as unknown as Meal]);
      }

      // Optionally save to recipe library
      if (saveAsRecipe && recipeName.trim()) {
        const alreadyExists = recipes.some(
          (r) => r.name.toLowerCase() === recipeName.trim().toLowerCase() && r.meal_type === editing.mealType
        );
        if (!alreadyExists) {
          const newRecipe = await pb.collection("meal_recipes").create({
            household: householdId,
            name: recipeName.trim(),
            meal_type: editing.mealType,
            notes: notes.trim() || undefined,
            ingredients: ingredients.trim() || undefined,
          });
          setRecipes((prev) => [...prev, newRecipe as unknown as MealRecipe].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }

      closeEdit();
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeal(id: string) {
    await pb.collection("meals").delete(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  async function deleteRecipe(id: string) {
    await pb.collection("meal_recipes").delete(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  const weekLabel = `${weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;

  const editingMeal = editing ? getMeal(editing.date, editing.mealType) : undefined;
  const editingMealType = MEAL_TYPES.find((t) => t.key === editing?.mealType);
  const editingLabel = editing
    ? `${new Date(editing.date + "T12:00:00").toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })} · ${editingMealType?.emoji} ${editingMealType?.label}`
    : "";

  const filteredRecipes = recipes.filter(
    (r) =>
      (!editing || r.meal_type === editing.mealType) &&
      r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meal Planner</h1>
        <div className="flex items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>←</Button>
          <span className="hidden sm:inline w-44 text-center text-muted-foreground text-xs">{weekLabel}</span>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>→</Button>
        </div>
      </div>

      {/* ── Desktop grid ── */}
      <div className="hidden md:block rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
          <div className="p-2" />
          {weekDates.map((date, i) => {
            const ds = toDateStr(date);
            const isToday = ds === todayStr;
            return (
              <div key={ds} className={cn("p-2 text-center border-l text-xs", isToday && "bg-primary/5")}>
                <div className={cn("font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{DAY_NAMES[i]}</div>
                <div className={cn("text-base font-bold", isToday ? "text-primary" : "")}>{date.getDate()}</div>
              </div>
            );
          })}
        </div>
        {MEAL_TYPES.map((mt, mti) => (
          <div key={mt.key} className={cn("grid grid-cols-[80px_repeat(7,1fr)]", mti < MEAL_TYPES.length - 1 && "border-b")}>
            <div className="p-3 flex flex-col items-center justify-center gap-0.5 border-r bg-muted/20">
              <span className="text-base">{mt.emoji}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{mt.label}</span>
            </div>
            {weekDates.map((date) => {
              const ds = toDateStr(date);
              const meal = getMeal(ds, mt.key);
              const isToday = ds === todayStr;
              return (
                <div
                  key={ds}
                  onClick={() => openEdit(ds, mt.key)}
                  className={cn(
                    "min-h-16 p-2 border-l cursor-pointer hover:bg-muted/30 transition-colors group",
                    isToday && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  {meal ? (
                    <div className="flex flex-col gap-0.5 h-full">
                      <p className="text-xs font-medium leading-tight">{meal.recipe_name}</p>
                      {meal.notes && <p className="text-[10px] text-muted-foreground leading-tight">{meal.notes}</p>}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMeal(meal.id); }}
                        className="mt-auto self-end text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      >✕</button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-sm group-hover:text-muted-foreground">+</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Mobile vertical list ── */}
      <div className="md:hidden flex flex-col gap-3">
        {weekDates.map((date, i) => {
          const ds = toDateStr(date);
          const isToday = ds === todayStr;
          return (
            <div key={ds} className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
              <div className={cn("px-4 py-2 border-b flex items-center gap-2", isToday && "bg-primary/5")}>
                <span className={cn("text-sm font-bold", isToday ? "text-primary" : "")}>{DAY_NAMES[i]}</span>
                <span className={cn("text-sm", isToday ? "text-primary" : "text-muted-foreground")}>
                  {date.toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
                {isToday && <span className="ml-auto text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">Today</span>}
              </div>
              <div className="divide-y">
                {MEAL_TYPES.map((mt) => {
                  const meal = getMeal(ds, mt.key);
                  return (
                    <div
                      key={mt.key}
                      onClick={() => openEdit(ds, mt.key)}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors group"
                    >
                      <span className="text-lg shrink-0">{mt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        {meal ? (
                          <>
                            <p className="text-sm font-medium leading-tight">{meal.recipe_name}</p>
                            {meal.notes && <p className="text-xs text-muted-foreground">{meal.notes}</p>}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 group-hover:text-muted-foreground">{mt.label}…</p>
                        )}
                      </div>
                      {meal && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMeal(meal.id); }}
                          className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 shrink-0"
                        >✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <div className="rounded-2xl bg-white border border-border shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editingLabel}</p>
            <button onClick={closeEdit} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>

          {/* For breakfast/lunch: show recipe card grid first if options exist */}
          {editing.mealType !== "dinner" && filteredRecipes.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Choose from saved options</Label>
                <button
                  type="button"
                  onClick={() => { setRecipeSearch(""); setShowRecipePicker((v) => !v); }}
                  className="text-xs text-orange-500 font-medium hover:underline"
                >
                  {showRecipePicker ? "Hide" : "Search"}
                </button>
              </div>
              {showRecipePicker && (
                <div className="flex items-center gap-2 rounded-lg border border-input px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    ref={searchRef}
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder="Filter…"
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredRecipes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pickRecipe(r)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5",
                      recipeName === r.name ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                    )}
                  >
                    <p className="text-sm font-medium leading-tight">{r.name}</p>
                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{r.notes}</p>}
                  </button>
                ))}
                {/* Custom option */}
                <button
                  type="button"
                  onClick={() => { setRecipeName(""); setShowRecipePicker(false); setTimeout(() => document.getElementById("meal-name-input")?.focus(), 50); }}
                  className="rounded-xl border border-dashed border-muted-foreground/40 px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Something else
                </button>
              </div>
              <div className="border-t pt-2">
                <Label className="text-xs text-muted-foreground">Or type a custom meal</Label>
              </div>
            </div>
          )}

          {/* For dinner or when no saved recipes: just the text input */}
          {(editing.mealType === "dinner" || filteredRecipes.length === 0) && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Meal</Label>
              {editing.mealType !== "dinner" && filteredRecipes.length === 0 && (
                <span className="text-[10px] text-muted-foreground">(add to recipe library to show picker next time)</span>
              )}
            </div>
          )}

          <Input
            id="meal-name-input"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder={editing.mealType === "dinner" ? "e.g. Pasta bolognese" : "e.g. Vegemite toast"}
            autoFocus={editing.mealType === "dinner" || filteredRecipes.length === 0}
            onKeyDown={(e) => { if (e.key === "Enter") saveMeal(); if (e.key === "Escape") closeEdit(); }}
          />

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Double the recipe"
            />
          </div>

          {saveAsRecipe && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Ingredients (optional, one per line)</Label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder={"2 eggs\n1 slice sourdough\nButter"}
                rows={3}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveAsRecipe}
              onChange={(e) => setSaveAsRecipe(e.target.checked)}
              className="rounded accent-primary"
            />
            <span className="text-xs text-muted-foreground">Save to recipe library for next time</span>
          </label>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={saveMeal} disabled={!recipeName.trim() || saving}>
              {saving ? "Saving…" : editingMeal ? "Update" : "Save"}
            </Button>
            <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            {editingMeal && (
              <Button variant="ghost" className="text-destructive ml-auto" onClick={() => { deleteMeal(editingMeal.id); closeEdit(); }}>
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Recipe library ── */}
      {recipes.length > 0 && !editing && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1 border-b flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-500" />
            <h2 className="font-bold text-sm">Recipe Library</h2>
          </div>
          <div className="divide-y">
            {MEAL_TYPES.map((mt) => {
              const group = recipes.filter((r) => r.meal_type === mt.key);
              if (group.length === 0) return null;
              return (
                <div key={mt.key} className="px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{mt.emoji} {mt.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.map((r) => (
                      <div key={r.id} className="flex items-center gap-1 bg-muted/60 rounded-full px-3 py-1 text-xs">
                        <span>{r.name}</span>
                        <button onClick={() => deleteRecipe(r.id)} className="text-muted-foreground hover:text-destructive ml-1">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
