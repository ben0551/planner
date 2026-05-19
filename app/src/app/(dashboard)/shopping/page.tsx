"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type ShoppingItem } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ShoppingPage() {
  const { householdId } = useAuth();
  const pb = getClient();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!householdId) return;
    pb.collection("shopping_items")
      .getFullList({ filter: `household="${householdId}"`, sort: "checked,category,name" })
      .then((items) => setItems(items as unknown as ShoppingItem[]));
  }, [householdId]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !householdId) return;
    const item = await pb.collection("shopping_items").create({
      household: householdId,
      name: name.trim(),
      quantity: quantity.trim() || undefined,
      category: category.trim() || undefined,
      checked: false,
    });
    setItems((prev) => [...prev, item as unknown as ShoppingItem]);
    setName(""); setQuantity(""); setCategory("");
  }

  async function toggleItem(item: ShoppingItem) {
    const updated = await pb.collection("shopping_items").update(item.id, { checked: !item.checked });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: updated.checked } : i));
  }

  async function clearChecked() {
    const checked = items.filter((i) => i.checked);
    await Promise.all(checked.map((i) => pb.collection("shopping_items").delete(i.id)));
    setItems((prev) => prev.filter((i) => !i.checked));
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const categories = [...new Set(unchecked.map((i) => i.category ?? ""))];

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

      <form onSubmit={addItem} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add item..."
          className="flex-1"
        />
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
          className="w-32"
        />
        <Button type="submit" disabled={!name.trim()}>Add</Button>
      </form>

      {items.length === 0 && (
        <p className="text-muted-foreground text-sm">Your shopping list is empty.</p>
      )}

      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-1">
          {cat && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{cat}</p>
          )}
          {unchecked
            .filter((i) => (i.category ?? "") === cat)
            .map((item) => (
              <ShoppingRow key={item.id} item={item} onToggle={toggleItem} />
            ))}
        </div>
      ))}

      {checked.length > 0 && (
        <div className="flex flex-col gap-1 opacity-50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In basket</p>
          {checked.map((item) => (
            <ShoppingRow key={item.id} item={item} onToggle={toggleItem} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
  onToggle,
}: {
  item: ShoppingItem;
  onToggle: (i: ShoppingItem) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
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
        <span className="text-xs text-muted-foreground">{item.quantity}</span>
      )}
    </div>
  );
}
