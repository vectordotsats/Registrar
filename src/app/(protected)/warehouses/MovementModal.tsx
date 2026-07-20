"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId, formatQty } from "@/lib/utils";
import type { Product, Warehouse } from "@/types";
import {
  X,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  Plus,
  Trash2,
  Search,
} from "lucide-react";

interface StaffName {
  id: string;
  name: string;
}
type Op = "in" | "out" | "transfer";
interface Line {
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
}

interface Props {
  warehouses: Warehouse[];
  products: Product[];
  staff: StaffName[];
  stock: Record<string, Record<string, number>>; // warehouseId -> productId -> qty
  defaultOperation?: Op;
  defaultWarehouseId?: string;
  defaultProductId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const OPS: { id: Op; label: string; icon: React.ReactNode }[] = [
  { id: "in", label: "Stock in", icon: <ArrowDownToLine size={16} /> },
  { id: "out", label: "Stock out", icon: <ArrowUpFromLine size={16} /> },
  { id: "transfer", label: "Transfer", icon: <ArrowRightLeft size={16} /> },
];

const unitOf = (p?: Product | null) =>
  p?.unit && p.unit.trim() ? p.unit.trim() : "units";

export default function MovementModal({
  warehouses,
  products,
  staff,
  stock,
  defaultOperation = "in",
  defaultWarehouseId = "",
  defaultProductId,
  onClose,
  onSuccess,
}: Props) {
  const supabase = createClient();
  const [op, setOp] = useState<Op>(defaultOperation);
  const [fromId, setFromId] = useState(
    defaultOperation === "in" ? "" : defaultWarehouseId,
  );
  const [toId, setToId] = useState(
    defaultOperation === "in" ? defaultWarehouseId : "",
  );
  const [movedBy, setMovedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(
    defaultProductId
      ? products.find((p) => p.id === defaultProductId) || null
      : null,
  );
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Where stock is drawn from (for out / transfer)
  const sourceId = op === "in" ? "" : fromId;
  const availableFor = (productId: string) =>
    sourceId ? stock[sourceId]?.[productId] || 0 : 0;

  const matches = query.trim()
    ? products
        .filter((p) =>
          p.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
        // For stock out / transfer, only offer products that actually have
        // stock in the source warehouse.
        .filter((p) => op === "in" || !fromId || availableFor(p.id) > 0)
        .slice(0, 8)
    : [];

  const changeOp = (next: Op) => {
    if (next === "in" && !toId && fromId) setToId(fromId);
    if (next !== "in" && !fromId && toId) setFromId(toId);
    setOp(next);
    setError("");
  };

  const addLine = () => {
    setError("");
    if (!selected) {
      setError("Pick a product first");
      return;
    }
    const q = parseInt(qty);
    if (!q || q <= 0) {
      setError("Enter a quantity");
      return;
    }
    const existing = lines.find((l) => l.productId === selected.id);
    const newTotal = (existing?.quantity || 0) + q;
    if (op !== "in") {
      const avail = availableFor(selected.id);
      if (newTotal > avail) {
        setError(`Only ${formatQty(avail, selected.unit)} available`);
        return;
      }
    }
    if (existing) {
      setLines((prev) =>
        prev.map((l) =>
          l.productId === selected.id ? { ...l, quantity: newTotal } : l,
        ),
      );
    } else {
      setLines((prev) => [
        ...prev,
        {
          productId: selected.id,
          name: selected.name,
          unit: selected.unit,
          quantity: q,
        },
      ]);
    }
    setSelected(null);
    setQuery("");
    setQty("");
  };

  const validate = (): string | null => {
    if (lines.length === 0) return "Add at least one item";
    if (op === "in" && !toId) return "Choose the warehouse receiving the stock";
    if (op === "out" && !fromId)
      return "Choose the warehouse the stock is leaving";
    if (op === "transfer") {
      if (!fromId || !toId) return "Choose both warehouses";
      if (fromId === toId) return "From and to must be different warehouses";
    }
    // Re-check every line against what's actually in the source (in case the
    // source warehouse was changed after items were added).
    if (op !== "in") {
      for (const line of lines) {
        const avail = stock[fromId]?.[line.productId] || 0;
        if (line.quantity > avail) {
          return `Only ${formatQty(avail, line.unit)} of ${line.name} in that warehouse`;
        }
      }
    }
    return null;
  };

  const applyDelta = async (
    warehouseId: string,
    productId: string,
    delta: number,
    businessId: string | null,
  ) => {
    const { data: existing } = await supabase
      .from("warehouse_stock")
      .select("id, quantity")
      .eq("warehouse_id", warehouseId)
      .eq("product_id", productId)
      .maybeSingle();
    if (existing) {
      return supabase
        .from("warehouse_stock")
        .update({
          quantity: existing.quantity + delta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    return supabase.from("warehouse_stock").insert({
      business_id: businessId,
      warehouse_id: warehouseId,
      product_id: productId,
      quantity: delta,
    });
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError("");
    const businessId = await getBusinessId(supabase);

    for (const line of lines) {
      let res;
      if (op === "in") {
        res = await applyDelta(toId, line.productId, line.quantity, businessId);
      } else if (op === "out") {
        res = await applyDelta(
          fromId,
          line.productId,
          -line.quantity,
          businessId,
        );
      } else {
        res = await applyDelta(
          fromId,
          line.productId,
          -line.quantity,
          businessId,
        );
        if (!res.error)
          res = await applyDelta(
            toId,
            line.productId,
            line.quantity,
            businessId,
          );
      }
      if (res.error) {
        setError(res.error.message);
        setLoading(false);
        return;
      }
      const { error: mErr } = await supabase.from("stock_movements").insert({
        business_id: businessId,
        product_id: line.productId,
        type: op,
        from_warehouse_id: op === "in" ? null : fromId,
        to_warehouse_id: op === "out" ? null : toId,
        quantity: line.quantity,
        moved_by: movedBy,
        notes: notes.trim(),
      });
      if (mErr) {
        setError(mErr.message);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    onSuccess();
  };

  const wOptions = (
    <>
      <option value="">Select warehouse...</option>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-screen sm:max-h-[92vh] overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            Record a movement
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Operation */}
          <div className="grid grid-cols-3 gap-2">
            {OPS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => changeOp(o.id)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  op === o.id
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          {/* Warehouses */}
          {op === "transfer" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From *
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
                >
                  {wOptions}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To *
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
                >
                  {wOptions}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {op === "in" ? "Into warehouse *" : "From warehouse *"}
              </label>
              <select
                value={op === "in" ? toId : fromId}
                onChange={(e) =>
                  op === "in"
                    ? setToId(e.target.value)
                    : setFromId(e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
              >
                {wOptions}
              </select>
            </div>
          )}

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items *
            </label>

            {lines.length > 0 && (
              <div className="space-y-2 mb-3">
                {lines.map((l) => (
                  <div
                    key={l.productId}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-sm text-gray-900 truncate">
                      <span className="font-semibold">
                        {formatQty(l.quantity, l.unit)}
                      </span>{" "}
                      {l.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((x) => x.productId !== l.productId),
                        )
                      }
                      className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!selected ? (
              <div>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a product to add..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                {matches.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    {matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelected(p);
                          setQuery("");
                          setError("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 text-sm flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 cursor-pointer"
                      >
                        <span className="truncate text-gray-900">{p.name}</span>
                        {op !== "in" && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatQty(availableFor(p.id), p.unit)} here
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-[var(--color-primary-light)] rounded-xl px-3 py-2.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selected.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    in {unitOf(selected)}
                    {op !== "in"
                      ? ` · ${formatQty(availableFor(selected.id), selected.unit)} here`
                      : ""}
                  </p>
                </div>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLine();
                    }
                  }}
                  placeholder="Qty"
                  min="1"
                  autoFocus
                  className="w-20 px-3 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={addLine}
                  className="p-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white flex-shrink-0 cursor-pointer"
                  title="Add item"
                >
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setQty("");
                    setError("");
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Done by */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Done by
            </label>
            <select
              value={movedBy}
              onChange={(e) => setMovedBy(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
            >
              <option value="">Select staff...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery from supplier"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              `Record${lines.length ? ` ${lines.length} item${lines.length > 1 ? "s" : ""}` : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
