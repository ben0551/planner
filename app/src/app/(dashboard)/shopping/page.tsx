"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type ShoppingItem, type ShoppingCatalog } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string };
type SortMode = "category" | "name" | "added_by";

export default function ShoppingPage() {
  const { householdId, user } = useAuth();
  const pb = getClient();
  const userId = user?.id ?? "";

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [goodPrice, setGoodPrice] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("category");
  const [catalog, setCatalog] = useState<ShoppingCatalog[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  type EditDraft = { id: string; quantity: string; category: string; goodPrice: string };
  const [editing, setEditing] = useState<EditDraft | null>(null);

  useEffect(() => {
    if (!householdId) return;
    pb.collection("shopping_items")
      .getFullList({ filter: `household="${householdId}"`, sort: "name" })
      .then((items) => setItems(items as unknown as ShoppingItem[]));
    pb.collection("shopping_catalog")
      .getFullList({ filter: `household="${householdId}"`, sort: "name" })
      .then((items) => setCatalog(items as unknown as ShoppingCatalog[]))
      .catch(() => {});
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) =>
        setMembers(
          ms.map((m: any) => ({
            id: m.expand?.user?.id ?? m.user,
            name: m.expand?.user?.name ?? "Member",
          })),
        ),
      )
      .catch(() => {});
  }, [householdId]);

  async function upsertCatalog(itemName: string, itemCategory: string, itemGoodPrice: string) {
    if (!householdId || !itemName.trim()) return;
    const existing = catalog.find((s) => s.name.toLowerCase() === itemName.trim().toLowerCase());
    const data: Record<string, string> = { household: householdId, name: itemName.trim() };
    if (itemCategory.trim()) data.category = itemCategory.trim();
    if (itemGoodPrice.trim()) data.good_price = itemGoodPrice.trim();
    if (existing) {
      if (itemCategory.trim() || itemGoodPrice.trim()) {
        await pb.collection("shopping_catalog").update(existing.id, data);
        setCatalog((prev) => prev.map((s) => s.id === existing.id ? { ...s, ...data } : s));
      }
    } else {
      const created = await pb.collection("shopping_catalog").create(data);
      setCatalog((prev) => [...prev, created as unknown as ShoppingCatalog].sort((a, b) => a.name.localeCompare(b.name)));
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !householdId) return;
    const item = await pb.collection("shopping_items").create({
      household: householdId,
      name: name.trim(),
      quantity: quantity.trim() || undefined,
      category: category.trim() || undefined,
      good_price: goodPrice.trim() || undefined,
      checked: false,
      added_by: userId || undefined,
    });
    setItems((prev) => [...prev, item as unknown as ShoppingItem]);
    await upsertCatalog(name.trim(), category.trim(), goodPrice.trim());
    setName(""); setQuantity(""); setCategory(""); setGoodPrice("");
    setShowSuggestions(false);
  }

  async function toggleItem(item: ShoppingItem) {
    const updated = await pb.collection("shopping_items").update(item.id, { checked: !item.checked });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: updated.checked } : i));
  }

  async function saveEdit() {
    if (!editing) return;
    await pb.collection("shopping_items").update(editing.id, {
      quantity: editing.quantity.trim() || null,
      category: editing.category.trim() || null,
      good_price: editing.goodPrice.trim() || null,
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === editing.id
          ? {
              ...i,
              quantity: editing.quantity.trim() || undefined,
              category: editing.category.trim() || undefined,
              good_price: editing.goodPrice.trim() || undefined,
            }
          : i,
      ),
    );
    const savedItem = items.find((i) => i.id === editing.id);
    if (savedItem) await upsertCatalog(savedItem.name, editing.category, editing.goodPrice);
    setEditing(null);
  }

  async function clearChecked() {
    const checked = items.filter((i) => i.checked);
    await Promise.all(checked.map((i) => pb.collection("shopping_items").delete(i.id)));
    setItems((prev) => prev.filter((i) => !i.checked));
  }

  function memberName(id?: string) {
    if (!id) return undefined;
    return members.find((m) => m.id === id)?.name;
  }

  function sortItems(list: ShoppingItem[]): { groupKey: string; items: ShoppingItem[] }[] {
    if (sortMode === "name") {
      return [{ groupKey: "", items: [...list].sort((a, b) => a.name.localeCompare(b.name)) }];
    }
    if (sortMode === "added_by") {
      const byAdder = new Map<string, ShoppingItem[]>();
      for (const item of list) {
        const key = item.meal_note ? "Planner" : (memberName(item.added_by) ?? "Unknown");
        if (!byAdder.has(key)) byAdder.set(key, []);
        byAdder.get(key)!.push(item);
      }
      return [...byAdder.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({ groupKey: key, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
    }
    // category (default)
    const byCat = new Map<string, ShoppingItem[]>();
    for (const item of list) {
      const key = item.category ?? "";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(item);
    }
    return [...byCat.entries()]
      .sort(([a], [b]) => {
        if (!a && b) return 1;
        if (a && !b) return -1;
        return a.localeCompare(b);
      })
      .map(([key, items]) => ({ groupKey: key, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const groups = sortItems(unchecked);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shopping List</h1>
        {checked.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChecked} className="text-muted-foreground">
            Clear checked ({checked.length})
          </Button>
        )}
      </div>

      <form onSubmit={addItem} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-32">
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Add item..."
          />
          {showSuggestions && name.trim().length > 0 && (() => {
            const suggestions = catalog
              .filter((s) => s.name.toLowerCase().includes(name.trim().toLowerCase()))
              .slice(0, 8);
            return suggestions.length > 0 ? (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-md mt-1 max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => {
                      setName(s.name);
                      if (s.category) setCategory(s.category);
                      if (s.good_price) setGoodPrice(s.good_price);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <span className="flex-1">{s.name}</span>
                    {s.category && <span className="text-xs text-muted-foreground">{s.category}</span>}
                    {s.good_price && <span className="text-xs text-emerald-600">≤ {s.good_price}</span>}
                  </button>
                ))}
              </div>
            ) : null;
          })()}
        </div>
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          className="w-20"
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="w-28"
        />
        <Input
          value={goodPrice}
          onChange={(e) => setGoodPrice(e.target.value)}
          placeholder="≤ good price"
          className="w-28"
        />
        <Button type="submit" disabled={!name.trim()}>Add</Button>
      </form>

      {/* Sort tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 self-start">
        {([
          { value: "category", label: "Category" },
          { value: "name",     label: "Name" },
          { value: "added_by", label: "Added by" },
        ] as { value: SortMode; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSortMode(value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              sortMode === value ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-muted-foreground text-sm">Your shopping list is empty.</p>
      )}

      {groups.map(({ groupKey, items: groupItems }) => (
        <div key={groupKey || "__none__"} className="flex flex-col gap-1">
          {groupKey && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{groupKey}</p>
          )}
          {groupItems.map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              addedByName={item.meal_note ? "Planner" : memberName(item.added_by)}
              isCurrentUser={item.added_by === userId && !item.meal_note}
              showAddedBy={sortMode !== "added_by"}
              editing={editing?.id === item.id ? editing : null}
              onToggle={toggleItem}
              onStartEdit={() => setEditing({ id: item.id, quantity: item.quantity ?? "", category: item.category ?? "", goodPrice: item.good_price ?? "" })}
              onEditChange={(draft) => setEditing(draft)}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditing(null)}
            />
          ))}
        </div>
      ))}

      {checked.length > 0 && (
        <div className="flex flex-col gap-1 opacity-50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In basket</p>
          {checked.map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              addedByName={item.meal_note ? "Planner" : memberName(item.added_by)}
              isCurrentUser={item.added_by === userId && !item.meal_note}
              showAddedBy={sortMode !== "added_by"}
              editing={null}
              onToggle={toggleItem}
              onStartEdit={() => {}}
              onEditChange={() => {}}
              onSaveEdit={async () => {}}
              onCancelEdit={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type EditDraft = { id: string; quantity: string; category: string; goodPrice: string };

function ShoppingRow({
  item,
  addedByName,
  isCurrentUser,
  showAddedBy,
  editing,
  onToggle,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
}: {
  item: ShoppingItem;
  addedByName: string | undefined;
  isCurrentUser: boolean;
  showAddedBy: boolean;
  editing: EditDraft | null;
  onToggle: (i: ShoppingItem) => void;
  onStartEdit: () => void;
  onEditChange: (draft: EditDraft) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 flex-wrap">
        <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-primary flex-shrink-0" />
        <span className="text-sm font-medium flex-1 min-w-24">{item.name}</span>
        <Input
          value={editing.quantity}
          onChange={(e) => onEditChange({ ...editing, quantity: e.target.value })}
          placeholder="Qty"
          className="h-7 w-20 text-xs"
        />
        <Input
          value={editing.category}
          onChange={(e) => onEditChange({ ...editing, category: e.target.value })}
          placeholder="Category"
          className="h-7 w-28 text-xs"
        />
        <Input
          value={editing.goodPrice}
          onChange={(e) => onEditChange({ ...editing, goodPrice: e.target.value })}
          placeholder="≤ good price"
          className="h-7 w-28 text-xs"
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
        />
        <button onClick={onSaveEdit} className="text-primary hover:opacity-70 transition-opacity shrink-0">
          <Check className="h-4 w-4" />
        </button>
        <button onClick={onCancelEdit} className="text-muted-foreground hover:opacity-70 transition-opacity shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item)}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-primary flex-shrink-0"
      />
      <span className={`flex-1 text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
        {item.name}
      </span>
      {item.quantity && (
        <span className="text-xs text-muted-foreground shrink-0">{item.quantity}</span>
      )}
      {item.good_price && (
        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">
          ≤ {item.good_price}
        </span>
      )}
      {item.meal_note && !item.checked && (
        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full shrink-0">
          🍽️ {item.meal_note}
        </span>
      )}
      {addedByName && !isCurrentUser && showAddedBy && (
        <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full shrink-0">
          {addedByName}
        </span>
      )}
      {!item.checked && (
        <button
          onClick={onStartEdit}
          className="hidden group-hover:flex text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
