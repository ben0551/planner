"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getClient, type ShoppingItem, type ShoppingCatalog, type ShoppingList } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Plus, Clock, ChevronDown, ChevronRight, Archive } from "lucide-react";
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

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>(
    () => (typeof window !== "undefined" ? localStorage.getItem("planner_shopping_list") ?? "" : ""),
  );
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [archivedLists, setArchivedLists] = useState<ShoppingList[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [historyItems, setHistoryItems] = useState<Map<string, ShoppingItem[]>>(new Map());

  useEffect(() => {
    if (!householdId) return;
    pb.collection("shopping_items")
      .getFullList({ filter: `household="${householdId}"` })
      .then((r) => {
          setItems((r as unknown as ShoppingItem[]).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => console.error("[shopping_items] fetch error:", err));
    pb.collection("shopping_catalog")
      .getFullList({ filter: `household="${householdId}"` })
      .then((r) => setCatalog((r as unknown as ShoppingCatalog[]).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
    pb.collection("memberships")
      .getFullList({ filter: `household="${householdId}"`, expand: "user" })
      .then((ms) =>
        setMembers(ms.map((m: any) => ({ id: m.expand?.user?.id ?? m.user, name: m.expand?.user?.name ?? "Member" })))
      )
      .catch(() => {});
    pb.collection("shopping_lists")
      .getFullList({ filter: `household="${householdId}"` })
      .then(async (loaded) => {
        let active = (loaded as unknown as ShoppingList[])
          .filter((l) => !l.archived)
          .sort((a, b) => (a.created ?? a.id ?? "").localeCompare(b.created ?? b.id ?? ""));
        if (active.length === 0) {
          const general = await pb.collection("shopping_lists").create({ household: householdId, name: "General", archived: false });
          active = [general as unknown as ShoppingList];
        }
        setLists(active);
        setSelectedListId((prev) => {
          const stored = prev || (typeof window !== "undefined" ? localStorage.getItem("planner_shopping_list") ?? "" : "");
          const valid = stored && active.some((l) => l.id === stored) ? stored : active[0].id;
          localStorage.setItem("planner_shopping_list", valid);
          return valid;
        });
      })
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
    if (!name.trim() || !householdId || !selectedListId) return;
    const item = await pb.collection("shopping_items").create({
      household: householdId,
      name: name.trim(),
      quantity: quantity.trim() || undefined,
      category: category.trim() || undefined,
      good_price: goodPrice.trim() || undefined,
      checked: false,
      added_by: userId || undefined,
      list: selectedListId,
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
          ? { ...i, quantity: editing.quantity.trim() || undefined, category: editing.category.trim() || undefined, good_price: editing.goodPrice.trim() || undefined }
          : i,
      ),
    );
    const savedItem = items.find((i) => i.id === editing.id);
    if (savedItem) await upsertCatalog(savedItem.name, editing.category, editing.goodPrice);
    setEditing(null);
  }

  async function clearChecked() {
    await Promise.all(checked.map((i) => pb.collection("shopping_items").delete(i.id)));
    const ids = new Set(checked.map((i) => i.id));
    setItems((prev) => prev.filter((i) => !ids.has(i.id)));
  }

  async function deleteItem(id: string) {
    await pb.collection("shopping_items").delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function addList() {
    if (!newListName.trim() || !householdId) return;
    const created = await pb.collection("shopping_lists").create({ household: householdId, name: newListName.trim(), archived: false });
    const newList = created as unknown as ShoppingList;
    setLists((prev) => [...prev, newList]);
    setSelectedListId(newList.id);
    setNewListName("");
    setShowNewList(false);
  }

  async function deleteList(id: string) {
    if (lists.length <= 1) return;
    const list = lists.find((l) => l.id === id);
    const isFirst = lists[0].id === id;
    const doomed = items.filter((i) => i.list === id || (!i.list && isFirst));
    const msg = doomed.length > 0
      ? `Delete "${list?.name}"? This will also delete ${doomed.length} item${doomed.length === 1 ? "" : "s"}.`
      : `Delete "${list?.name}"?`;
    if (!confirm(msg)) return;
    await Promise.all(doomed.map((i) => pb.collection("shopping_items").delete(i.id)));
    await pb.collection("shopping_lists").delete(id);
    const remaining = lists.filter((l) => l.id !== id);
    setLists(remaining);
    setItems((prev) => prev.filter((i) => !doomed.some((d) => d.id === i.id)));
    if (selectedListId === id) setSelectedListId(remaining[0]?.id ?? "");
  }

  async function completeShop() {
    if (!selectedListId || !householdId) return;
    const currentList = lists.find((l) => l.id === selectedListId);
    if (!currentList) return;

    const uncheckedItems = listItems.filter((i) => !i.checked);
    const checkedCount = listItems.length - uncheckedItems.length;

    if (!confirm(`Complete this "${currentList.name}" shop? ${checkedCount} checked item${checkedCount === 1 ? "" : "s"} will be saved to history.`)) return;

    const moveUnchecked =
      uncheckedItems.length > 0 &&
      confirm(
        `${uncheckedItems.length} item${uncheckedItems.length === 1 ? " wasn't" : "s weren't"} checked off. Move ${uncheckedItems.length === 1 ? "it" : "them"} to the next shop?`,
      );

    // Assign legacy null-list items to this list if it's the first one
    const isFirst = lists[0].id === selectedListId;
    if (isFirst) {
      const nullItems = items.filter((i) => !i.list);
      await Promise.all(nullItems.map((i) => pb.collection("shopping_items").update(i.id, { list: selectedListId })));
    }

    const now = new Date().toISOString().slice(0, 10);
    await pb.collection("shopping_lists").update(selectedListId, { archived: true, archived_at: now });

    const fresh = await pb.collection("shopping_lists").create({ household: householdId, name: currentList.name, archived: false });
    const freshList = fresh as unknown as ShoppingList;

    if (moveUnchecked && uncheckedItems.length > 0) {
      await Promise.all(uncheckedItems.map((i) =>
        pb.collection("shopping_items").update(i.id, { list: freshList.id, checked: false })
      ));
    }

    const currentIds = new Set(listItems.map((i) => i.id));
    const uncheckedIds = new Set(uncheckedItems.map((i) => i.id));

    setLists((prev) => prev.map((l) => l.id === selectedListId ? freshList : l));
    setSelectedListId(freshList.id);
    setItems((prev) =>
      prev
        .filter((i) => !currentIds.has(i.id) || (moveUnchecked && uncheckedIds.has(i.id)))
        .map((i) => uncheckedIds.has(i.id) ? { ...i, list: freshList.id, checked: false } : i)
    );

    if (showHistory) {
      setArchivedLists((prev) => [{ ...currentList, archived: true, archived_at: now }, ...prev]);
    }
  }

  async function toggleHistory() {
    if (showHistory) { setShowHistory(false); return; }
    setShowHistory(true);
    if (archivedLists.length === 0 && !loadingHistory) {
      setLoadingHistory(true);
      try {
        const all = await pb.collection("shopping_lists").getFullList({
          filter: `household="${householdId}"`,
        });
        setArchivedLists(
          (all as unknown as ShoppingList[]).filter((l) => l.archived)
            .sort((a, b) => (b.archived_at ?? b.id).localeCompare(a.archived_at ?? a.id)),
        );
      } finally { setLoadingHistory(false); }
    }
  }

  async function toggleHistoryExpand(listId: string) {
    if (expandedHistory.has(listId)) {
      setExpandedHistory((prev) => { const s = new Set(prev); s.delete(listId); return s; });
      return;
    }
    setExpandedHistory((prev) => new Set([...prev, listId]));
    if (!historyItems.has(listId)) {
      const loaded = await pb.collection("shopping_items").getFullList({ filter: `list="${listId}"` });
      setHistoryItems((prev) => new Map([...prev, [listId, loaded as unknown as ShoppingItem[]]]));
    }
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
    const byCat = new Map<string, ShoppingItem[]>();
    for (const item of list) {
      const key = item.category ?? "";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(item);
    }
    return [...byCat.entries()]
      .sort(([a], [b]) => { if (!a && b) return 1; if (a && !b) return -1; return a.localeCompare(b); })
      .map(([key, items]) => ({ groupKey: key, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
  }

  const isFirstList = lists.length > 0 && lists[0].id === selectedListId;
  const listItems = items.filter((i) => i.list === selectedListId || (!i.list && isFirstList));
  const unchecked = listItems.filter((i) => !i.checked);
  const checked = listItems.filter((i) => i.checked);
  const groups = sortItems(unchecked);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Shopping</h1>
        <div className="flex items-center gap-2">
          {checked.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChecked} className="text-muted-foreground">
              Clear checked ({checked.length})
            </Button>
          )}
          {listItems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={completeShop} className="text-muted-foreground flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              Complete shop
            </Button>
          )}
        </div>
      </div>

      {/* List tabs */}
      <div className="flex gap-1 items-center flex-wrap">
        {lists.map((list) => {
          const count = items.filter((i) => (i.list === list.id || (!i.list && lists[0].id === list.id)) && !i.checked).length;
          const isSelected = selectedListId === list.id;
          return (
            <div key={list.id} className="flex items-center shrink-0">
              <button
                onClick={() => { setSelectedListId(list.id); localStorage.setItem("planner_shopping_list", list.id); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold transition-colors",
                  lists.length > 1 ? "rounded-l-xl" : "rounded-xl",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {list.name}
                {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
              </button>
              {lists.length > 1 && (
                <button
                  onClick={() => deleteList(list.id)}
                  className={cn(
                    "px-1.5 py-1.5 rounded-r-xl text-xs transition-colors border-l",
                    isSelected
                      ? "bg-primary/80 text-primary-foreground border-primary/60 hover:bg-destructive"
                      : "bg-muted text-muted-foreground border-muted-foreground/20 hover:text-destructive",
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {showNewList ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addList();
                if (e.key === "Escape") { setShowNewList(false); setNewListName(""); }
              }}
              placeholder="List name…"
              autoFocus
              className="h-7 w-28 rounded-xl border border-input bg-background px-2 text-xs"
            />
            <button onClick={addList} className="text-xs text-primary font-semibold">Add</button>
            <button onClick={() => { setShowNewList(false); setNewListName(""); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewList(true)}
            className="px-2 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 flex items-center gap-0.5"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={toggleHistory}
          className={cn(
            "ml-auto px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors shrink-0",
            showHistory ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Clock className="h-3 w-3" />
          History
        </button>
      </div>

      {/* Add item form */}
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
              <div className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-xl shadow-md mt-1 max-h-48 overflow-y-auto">
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
        <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" className="w-20" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="w-28" />
        <Input value={goodPrice} onChange={(e) => setGoodPrice(e.target.value)} placeholder="≤ good price" className="w-28" />
        <Button type="submit" disabled={!name.trim() || !selectedListId}>Add</Button>
      </form>

      {/* Sort tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 self-start">
        {([
          { value: "category", label: "Category" },
          { value: "name", label: "Name" },
          { value: "added_by", label: "Added by" },
        ] as { value: SortMode; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSortMode(value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              sortMode === value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {listItems.length === 0 && lists.length > 0 && (
        <p className="text-muted-foreground text-sm">This list is empty.</p>
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
              onDelete={() => deleteItem(item.id)}
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
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Shopping History
          </h2>
          {loadingHistory && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loadingHistory && archivedLists.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No completed shops yet. Use "Complete shop" when you get home — it saves your list to history and clears it for next time.
            </p>
          )}
          {archivedLists.map((aList) => {
            const isExpanded = expandedHistory.has(aList.id);
            const hItems = historyItems.get(aList.id);
            const purchasedCount = hItems?.filter((i) => i.checked).length ?? 0;
            return (
              <div key={aList.id} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleHistoryExpand(aList.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                >
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{aList.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {aList.archived_at ?? "Unknown date"}
                      {hItems && ` · ${purchasedCount} of ${hItems.length} purchased`}
                    </p>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t divide-y">
                    {!hItems && <p className="px-4 py-3 text-sm text-muted-foreground">Loading…</p>}
                    {hItems?.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">No items recorded.</p>}
                    {hItems?.map((item) => (
                      <div key={item.id} className={cn("flex items-center gap-3 px-4 py-2", !item.checked && "opacity-40")}>
                        <Check className={cn("h-4 w-4 shrink-0", item.checked ? "text-emerald-500" : "text-muted-foreground/30")} />
                        <span className={cn("flex-1 text-sm", !item.checked && "line-through")}>{item.name}</span>
                        {item.quantity && <span className="text-xs text-muted-foreground shrink-0">{item.quantity}</span>}
                        {item.good_price && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">≤ {item.good_price}</span>
                        )}
                        {item.meal_note && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full shrink-0">🍽️ {item.meal_note}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
  onDelete,
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
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 flex-wrap">
        <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-primary flex-shrink-0" />
        <span className="text-sm font-medium flex-1 min-w-24">{item.name}</span>
        <Input value={editing.quantity} onChange={(e) => onEditChange({ ...editing, quantity: e.target.value })} placeholder="Qty" className="h-7 w-20 text-xs" />
        <Input value={editing.category} onChange={(e) => onEditChange({ ...editing, category: e.target.value })} placeholder="Category" className="h-7 w-28 text-xs" />
        <Input value={editing.goodPrice} onChange={(e) => onEditChange({ ...editing, goodPrice: e.target.value })} placeholder="≤ good price" className="h-7 w-28 text-xs"
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()} />
        <button onClick={onSaveEdit} className="text-primary hover:opacity-70 transition-opacity shrink-0"><Check className="h-4 w-4" /></button>
        <button onClick={onCancelEdit} className="text-muted-foreground hover:opacity-70 transition-opacity shrink-0"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group">
      <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-primary flex-shrink-0" />
      <span className={`flex-1 text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>{item.name}</span>
      {item.quantity && <span className="text-xs text-muted-foreground shrink-0">{item.quantity}</span>}
      {item.good_price && (
        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">≤ {item.good_price}</span>
      )}
      {item.meal_note && !item.checked && (
        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full shrink-0">🍽️ {item.meal_note}</span>
      )}
      {addedByName && !isCurrentUser && showAddedBy && (
        <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full shrink-0">{addedByName}</span>
      )}
      {!item.checked && (
        <button onClick={onStartEdit} className="hidden group-hover:flex text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={onDelete} className="hidden group-hover:flex text-muted-foreground hover:text-destructive transition-colors shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
