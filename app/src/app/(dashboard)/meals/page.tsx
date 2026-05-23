"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type Meal, type MealRecipe } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BookOpen, Plus, Search, ShoppingCart, Check, ExternalLink, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner" | "extras";
type PageView = "planner" | "library";

const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳" },
  { key: "lunch",     label: "Lunch",     emoji: "🥪" },
  { key: "dinner",    label: "Dinner",    emoji: "🍽️" },
  { key: "extras",    label: "Extras",    emoji: "🍱" },
];

const CATEGORY_SUGGESTIONS = [
  "Quick", "Healthy", "Veggie", "Pasta", "Soup", "Salad",
  "Sandwich", "Eggs", "Smoothie", "Toast", "Snack",
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

interface RecipeFormState {
  name: string;
  mealType: MealType;
  category: string;
  notes: string;
  ingredients: string;
  url: string;
}

const defaultRecipeForm = (): RecipeFormState => ({
  name: "", mealType: "breakfast", category: "", notes: "", ingredients: "", url: "",
});

function formFromRecipe(r: MealRecipe): RecipeFormState {
  return {
    name: r.name,
    mealType: r.meal_type,
    category: r.category ?? "",
    notes: r.notes ?? "",
    ingredients: r.ingredients ?? "",
    url: r.url ?? "",
  };
}

interface Editing { date: string; mealType: MealType; mealId?: string }

export default function MealsPage() {
  const { householdId } = useAuth();
  const pb = getClient();

  // ── View toggle ──
  const [view, setView] = useState<PageView>("planner");

  // ── Planner state ──
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [recipeName, setRecipeName] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [mealIngredients, setMealIngredients] = useState("");
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [shoppingPanel, setShoppingPanel] = useState<{ ingredient: string; meal: string; selected: boolean }[] | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Library state ──
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMealFilter, setLibraryMealFilter] = useState<MealType | "all">("all");
  const [editingRecipe, setEditingRecipe] = useState<MealRecipe | null>(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(defaultRecipeForm());
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

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

  // ── Planner helpers ──

  function getMeals(dateStr: string, mealType: MealType): Meal[] {
    return meals.filter((m) => m.date.startsWith(dateStr) && m.meal_type === mealType);
  }

  function openEdit(dateStr: string, mealType: MealType, mealId?: string) {
    const meal = mealId ? meals.find((m) => m.id === mealId) : undefined;
    setRecipeName(meal?.recipe_name ?? "");
    setMealNotes(meal?.notes ?? "");
    setMealIngredients("");
    setSaveAsRecipe(false);
    setRecipeSearch("");
    setShowRecipePicker(false);
    setEditing({ date: dateStr, mealType, mealId });
  }

  function closeEdit() {
    setEditing(null); setRecipeName(""); setMealNotes(""); setMealIngredients("");
    setSaveAsRecipe(false); setShowRecipePicker(false);
  }

  function pickRecipe(recipe: MealRecipe) {
    setRecipeName(recipe.name);
    setMealNotes(recipe.notes ?? "");
    setMealIngredients(recipe.ingredients ?? "");
    setShowRecipePicker(false);
    setSaveAsRecipe(false);
  }

  async function saveMeal() {
    if (!editing || !recipeName.trim() || !householdId) return;
    setSaving(true);
    try {
      if (editing.mealId) {
        const saved = await pb.collection("meals").update(editing.mealId, {
          recipe_name: recipeName.trim(), notes: mealNotes.trim() || undefined,
        });
        setMeals((prev) => prev.map((m) => m.id === editing.mealId ? { ...m, ...saved } as Meal : m));
      } else {
        const saved = await pb.collection("meals").create({
          household: householdId, date: editing.date, meal_type: editing.mealType,
          recipe_name: recipeName.trim(), notes: mealNotes.trim() || undefined,
        });
        setMeals((prev) => [...prev, saved as unknown as Meal]);
      }
      if (saveAsRecipe && recipeName.trim()) {
        const alreadyExists = recipes.some(
          (r) => r.name.toLowerCase() === recipeName.trim().toLowerCase() && r.meal_type === editing.mealType
        );
        if (!alreadyExists) {
          const newRecipe = await pb.collection("meal_recipes").create({
            household: householdId, name: recipeName.trim(), meal_type: editing.mealType,
            notes: mealNotes.trim() || undefined, ingredients: mealIngredients.trim() || undefined,
          });
          setRecipes((prev) => [...prev, newRecipe as unknown as MealRecipe].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      closeEdit();
    } finally { setSaving(false); }
  }

  async function deleteMeal(id: string) {
    await pb.collection("meals").delete(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  function openShoppingPanel() {
    const seen = new Set<string>();
    const items: { ingredient: string; meal: string; selected: boolean }[] = [];
    const sorted = [...meals].sort((a, b) => a.date.localeCompare(b.date));
    for (const meal of sorted) {
      const recipe = recipes.find(
        (r) => r.name.toLowerCase() === meal.recipe_name.toLowerCase() && r.meal_type === meal.meal_type
      );
      if (recipe?.ingredients) {
        for (const line of recipe.ingredients.split("\n").map((l) => l.trim()).filter(Boolean)) {
          const key = line.toLowerCase();
          if (!seen.has(key)) { seen.add(key); items.push({ ingredient: line, meal: meal.recipe_name, selected: true }); }
        }
      }
    }
    if (items.length === 0) {
      alert("No ingredients found. Add ingredients to recipes in the Recipe Library.");
      return;
    }
    setShoppingPanel(items);
  }

  async function confirmAddToShoppingList() {
    if (!householdId || !shoppingPanel) return;
    const chosen = shoppingPanel.filter((i) => i.selected);
    if (chosen.length === 0) return;
    setAddingToCart(true);
    try {
      await Promise.all(chosen.map((item) =>
        pb.collection("shopping_items").create({ household: householdId, name: item.ingredient, category: "Meals", checked: false })
      ));
      setShoppingPanel(null);
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 3000);
    } finally { setAddingToCart(false); }
  }

  // ── Library helpers ──

  function openAddRecipe(mealType?: MealType) {
    setRecipeForm({ ...defaultRecipeForm(), mealType: mealType ?? "breakfast" });
    setEditingRecipe(null);
    setImportUrl("");
    setImportError("");
    setShowRecipeForm(true);
  }

  function openEditRecipe(recipe: MealRecipe) {
    setRecipeForm(formFromRecipe(recipe));
    setEditingRecipe(recipe);
    setImportUrl("");
    setImportError("");
    setShowRecipeForm(true);
  }

  function closeRecipeForm() {
    setShowRecipeForm(false);
    setEditingRecipe(null);
    setRecipeForm(defaultRecipeForm());
    setImportUrl("");
    setImportError("");
  }

  function setRecipeField<K extends keyof RecipeFormState>(k: K, v: RecipeFormState[K]) {
    setRecipeForm((f) => ({ ...f, [k]: v }));
  }

  async function tryImportUrl() {
    const url = importUrl.trim();
    if (!url) return;
    setImportLoading(true);
    setImportError("");
    try {
      const res = await fetch(url, { mode: "no-cors" });
      // no-cors returns opaque response — we can't read it, but we can use the URL's path as a name hint
      const pathName = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
      const guessedName = pathName.replace(/[-_]/g, " ").replace(/\.\w+$/, "").replace(/\b\w/g, (c) => c.toUpperCase());
      setRecipeField("name", guessedName || "Imported recipe");
      setRecipeField("url", url);
    } catch {
      // Just save the URL as a reference
      setRecipeField("url", url);
      setImportError("Could not auto-import — URL saved as a reference. Fill in details manually.");
    } finally {
      setImportLoading(false);
    }
  }

  async function saveRecipe() {
    if (!recipeForm.name.trim() || !householdId) return;
    setRecipeSaving(true);
    try {
      const payload = {
        household: householdId,
        name: recipeForm.name.trim(),
        meal_type: recipeForm.mealType,
        category: recipeForm.category.trim() || undefined,
        notes: recipeForm.notes.trim() || undefined,
        ingredients: recipeForm.ingredients.trim() || undefined,
        url: recipeForm.url.trim() || undefined,
      };
      if (editingRecipe) {
        await pb.collection("meal_recipes").update(editingRecipe.id, payload);
        setRecipes((prev) =>
          prev.map((r) => r.id === editingRecipe.id ? { ...r, ...payload, id: editingRecipe.id } as MealRecipe : r)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        const saved = await pb.collection("meal_recipes").create(payload);
        setRecipes((prev) => [...prev, saved as unknown as MealRecipe].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeRecipeForm();
    } finally { setRecipeSaving(false); }
  }

  async function deleteRecipe(id: string) {
    await pb.collection("meal_recipes").delete(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Derived ──

  const weekLabel = `${weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
  const editingMeal = editing?.mealId ? meals.find((m) => m.id === editing.mealId) : undefined;
  const editingMealType = MEAL_TYPES.find((t) => t.key === editing?.mealType);
  const editingLabel = editing
    ? `${new Date(editing.date + "T12:00:00").toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })} · ${editingMealType?.emoji} ${editingMealType?.label}`
    : "";
  const filteredPickerRecipes = recipes.filter(
    (r) => (!editing || r.meal_type === editing.mealType) &&
      r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );
  const filteredLibraryRecipes = recipes.filter(
    (r) =>
      (libraryMealFilter === "all" || r.meal_type === libraryMealFilter) &&
      (r.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
        (r.category ?? "").toLowerCase().includes(librarySearch.toLowerCase()))
  );

  // ─────────────────────────────────────────────
  // Recipe Library view
  // ─────────────────────────────────────────────
  if (view === "library") {
    return (
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView("planner"); setShowRecipeForm(false); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Meal Planner
            </button>
            <h1 className="text-xl font-black flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" /> Recipe Library
            </h1>
          </div>
          <button
            onClick={() => openAddRecipe()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add recipe
          </button>
        </div>

        {/* Import from web */}
        <div className="rounded-2xl bg-white border border-border shadow-sm p-4 flex flex-col gap-2">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Import from web</p>
          <div className="flex gap-2">
            <Input
              placeholder="Paste a recipe URL…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!importUrl.trim() || importLoading}
              onClick={tryImportUrl}
            >
              {importLoading ? "…" : "Import"}
            </Button>
          </div>
          {importError && <p className="text-xs text-muted-foreground">{importError}</p>}
          <p className="text-[11px] text-muted-foreground">Saves the URL as a reference and pre-fills the name. Fill in ingredients manually.</p>
        </div>

        {/* Add / Edit form */}
        {showRecipeForm && (
          <div className="rounded-2xl bg-white border border-border shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-black text-sm">{editingRecipe ? "Edit recipe" : "New recipe"}</p>
              <button onClick={closeRecipeForm}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Recipe name</Label>
                <Input value={recipeForm.name} onChange={(e) => setRecipeField("name", e.target.value)}
                  placeholder="e.g. Avo toast" autoFocus />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Meal type</Label>
                <select value={recipeForm.mealType} onChange={(e) => setRecipeField("mealType", e.target.value as MealType)}
                  className="h-9 rounded-xl border border-input bg-background px-3 text-sm font-medium">
                  {MEAL_TYPES.map((mt) => (
                    <option key={mt.key} value={mt.key}>{mt.emoji} {mt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs">Category</Label>
              <div className="flex flex-col gap-1.5">
                <Input value={recipeForm.category} onChange={(e) => setRecipeField("category", e.target.value)}
                  placeholder="e.g. Quick, Healthy, Pasta…" />
                <div className="flex flex-wrap gap-1">
                  {CATEGORY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRecipeField("category", s)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                        recipeForm.category === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                      )}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs">Ingredients (one per line)</Label>
              <textarea
                value={recipeForm.ingredients}
                onChange={(e) => setRecipeField("ingredients", e.target.value)}
                placeholder={"2 slices sourdough\n1 avocado\nLemon juice\nSalt & pepper"}
                rows={4}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs">Notes</Label>
              <Input value={recipeForm.notes} onChange={(e) => setRecipeField("notes", e.target.value)}
                placeholder="e.g. Double for 4 people" />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs">Source URL (optional)</Label>
              <Input value={recipeForm.url} onChange={(e) => setRecipeField("url", e.target.value)}
                placeholder="https://…" type="url" />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveRecipe} disabled={recipeSaving || !recipeForm.name.trim()} className="rounded-xl font-bold">
                {recipeSaving ? "Saving…" : editingRecipe ? "Save changes" : "Add recipe"}
              </Button>
              <Button variant="ghost" onClick={closeRecipeForm} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-white px-3 py-2 flex-1 min-w-40">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search recipes…" className="flex-1 text-sm outline-none bg-transparent" />
          </div>
          <div className="flex gap-1">
            {([{ key: "all", label: "All" }, ...MEAL_TYPES.map((m) => ({ key: m.key, label: m.emoji }))] as { key: string; label: string }[]).map((f) => (
              <button
                key={f.key}
                onClick={() => setLibraryMealFilter(f.key as MealType | "all")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-bold transition-colors",
                  libraryMealFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-border text-muted-foreground hover:bg-muted/50"
                )}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Recipe cards grouped by meal type */}
        {filteredLibraryRecipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted-foreground/30 p-10 text-center text-sm text-muted-foreground">
            {recipes.length === 0 ? "No recipes yet — add one above! 🍽️" : "No recipes match your search."}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {MEAL_TYPES.map((mt) => {
              const group = filteredLibraryRecipes.filter((r) => r.meal_type === mt.key);
              if (group.length === 0) return null;
              return (
                <div key={mt.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{mt.emoji}</span>
                    <h2 className="font-black text-sm">{mt.label}</h2>
                    <button
                      onClick={() => openAddRecipe(mt.key)}
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.map((recipe) => (
                      <div key={recipe.id} className="rounded-2xl bg-white border border-border shadow-sm p-3.5 flex gap-3">
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-sm">{recipe.name}</p>
                            {recipe.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                {recipe.category}
                              </span>
                            )}
                            {recipe.url && (
                              <a href={recipe.url} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {recipe.notes && (
                            <p className="text-xs text-muted-foreground">{recipe.notes}</p>
                          )}
                          {recipe.ingredients && (
                            <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2">
                              {recipe.ingredients.split("\n").filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => openEditRecipe(recipe)}
                            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteRecipe(recipe.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Meal Planner view
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Meal Planner</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setView("library"); setShowRecipeForm(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Recipe Library
            {recipes.length > 0 && (
              <span className="bg-orange-200 text-orange-800 rounded-full px-1.5 text-[10px]">{recipes.length}</span>
            )}
          </button>
          {meals.length > 0 && (
            <button
              onClick={openShoppingPanel}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors",
                cartAdded
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cartAdded ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
              {cartAdded ? "Added!" : "Add to shopping"}
            </button>
          )}
          <div className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="hidden sm:inline w-44 text-center text-muted-foreground text-xs">{weekLabel}</span>
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ingredient selection panel */}
      {shoppingPanel && (
        <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange-500" />
              <h2 className="font-bold text-sm">Add to shopping list</h2>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShoppingPanel((p) => p?.map((i) => ({ ...i, selected: true })) ?? null)}
                className="text-xs text-muted-foreground hover:text-foreground">All</button>
              <button onClick={() => setShoppingPanel((p) => p?.map((i) => ({ ...i, selected: false })) ?? null)}
                className="text-xs text-muted-foreground hover:text-foreground">None</button>
              <button onClick={() => setShoppingPanel(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {shoppingPanel.map((item, i) => (
              <label key={i} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" checked={item.selected}
                  onChange={() => setShoppingPanel((p) => p?.map((it, j) => j === i ? { ...it, selected: !it.selected } : it) ?? null)}
                  className="h-4 w-4 rounded accent-primary shrink-0" />
                <span className={cn("flex-1 text-sm", !item.selected && "text-muted-foreground line-through")}>{item.ingredient}</span>
                <span className="text-xs text-muted-foreground shrink-0">{item.meal}</span>
              </label>
            ))}
          </div>
          <div className="px-4 py-3 border-t flex items-center gap-3">
            <Button size="sm" onClick={confirmAddToShoppingList}
              disabled={addingToCart || shoppingPanel.every((i) => !i.selected)}>
              {addingToCart ? "Adding…" : `Add ${shoppingPanel.filter((i) => i.selected).length} item${shoppingPanel.filter((i) => i.selected).length === 1 ? "" : "s"}`}
            </Button>
            <button onClick={() => setShoppingPanel(null)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

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
              const cellMeals = getMeals(ds, mt.key);
              const isToday = ds === todayStr;
              return (
                <div key={ds}
                  className={cn(
                    "min-h-16 p-2 border-l transition-colors",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div className="flex flex-col gap-1 h-full">
                    {cellMeals.map((meal) => (
                      <div key={meal.id}
                        onClick={() => openEdit(ds, mt.key, meal.id)}
                        className="flex items-start gap-1 cursor-pointer group/item rounded px-0.5 hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-xs font-medium leading-tight flex-1">{meal.recipe_name}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMeal(meal.id); }}
                          className="text-[10px] text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-destructive shrink-0 leading-tight"
                        >✕</button>
                      </div>
                    ))}
                    <button
                      onClick={() => openEdit(ds, mt.key)}
                      className="mt-auto text-muted-foreground/30 text-sm hover:text-muted-foreground transition-colors leading-none"
                    >+</button>
                  </div>
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
                  const cellMeals = getMeals(ds, mt.key);
                  return (
                    <div key={mt.key} className="flex flex-col divide-y divide-border/50">
                      {cellMeals.map((meal) => (
                        <div key={meal.id}
                          onClick={() => openEdit(ds, mt.key, meal.id)}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors group"
                        >
                          <span className="text-lg shrink-0">{mt.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{meal.recipe_name}</p>
                            {meal.notes && <p className="text-xs text-muted-foreground">{meal.notes}</p>}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteMeal(meal.id); }}
                            className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 shrink-0">✕</button>
                        </div>
                      ))}
                      <div onClick={() => openEdit(ds, mt.key)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors group"
                      >
                        <span className={cn("text-lg shrink-0", cellMeals.length > 0 ? "opacity-30" : "opacity-100")}>{mt.emoji}</span>
                        <p className="text-sm text-muted-foreground/50 group-hover:text-muted-foreground">
                          {cellMeals.length > 0 ? `+ add ${mt.label.toLowerCase()}` : `${mt.label}…`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Edit meal form ── */}
      {editing && (
        <div className="rounded-2xl bg-white border border-border shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editingLabel}</p>
            <button onClick={closeEdit}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>

          {filteredPickerRecipes.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Choose from saved options</Label>
                <button type="button"
                  onClick={() => { setRecipeSearch(""); setShowRecipePicker((v) => !v); }}
                  className="text-xs text-orange-500 font-medium hover:underline">
                  {showRecipePicker ? "Hide" : "Search"}
                </button>
              </div>
              {showRecipePicker && (
                <div className="flex items-center gap-2 rounded-lg border border-input px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input ref={searchRef} value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder="Filter…" className="flex-1 text-sm outline-none bg-transparent" />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredPickerRecipes.map((r) => (
                  <button key={r.id} type="button" onClick={() => pickRecipe(r)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5",
                      recipeName === r.name ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                    )}>
                    <p className="text-sm font-medium leading-tight">{r.name}</p>
                    {r.category && <p className="text-[10px] text-primary/70 font-medium mt-0.5">{r.category}</p>}
                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{r.notes}</p>}
                  </button>
                ))}
                <button type="button"
                  onClick={() => { setRecipeName(""); setShowRecipePicker(false); setTimeout(() => document.getElementById("meal-name-input")?.focus(), 50); }}
                  className="rounded-xl border border-dashed border-muted-foreground/40 px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Something else
                </button>
              </div>
              <div className="border-t pt-2">
                <Label className="text-xs text-muted-foreground">Or type a custom meal</Label>
              </div>
            </div>
          )}

          <Input id="meal-name-input" value={recipeName} onChange={(e) => setRecipeName(e.target.value)}
            placeholder={editing.mealType === "dinner" ? "e.g. Pasta bolognese" : "e.g. Vegemite toast"}
            autoFocus={editing.mealType === "dinner" || filteredPickerRecipes.length === 0}
            onKeyDown={(e) => { if (e.key === "Enter") saveMeal(); if (e.key === "Escape") closeEdit(); }} />

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Notes</Label>
            <Input value={mealNotes} onChange={(e) => setMealNotes(e.target.value)} placeholder="e.g. Double the recipe" />
          </div>

          {saveAsRecipe && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Ingredients (one per line)</Label>
              <textarea value={mealIngredients} onChange={(e) => setMealIngredients(e.target.value)}
                placeholder={"2 eggs\n1 slice sourdough\nButter"} rows={3}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={saveAsRecipe} onChange={(e) => setSaveAsRecipe(e.target.checked)}
              className="rounded accent-primary" />
            <span className="text-xs text-muted-foreground">Save to recipe library for next time</span>
          </label>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={saveMeal} disabled={!recipeName.trim() || saving}>
              {saving ? "Saving…" : editingMeal ? "Update" : "Save"}
            </Button>
            <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            {editingMeal && (
              <Button variant="ghost" className="text-destructive ml-auto"
                onClick={() => { deleteMeal(editingMeal.id); closeEdit(); }}>
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
