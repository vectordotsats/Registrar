"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId } from "@/lib/utils";
import type { Product, Warehouse } from "@/types";
import { X, Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const STOCK_UNITS = [
  { label: "Piece", value: 1 },
  { label: "Pack of 6", value: 6 },
  { label: "Dozen (12)", value: 12 },
  { label: "Pack of 20", value: 20 },
  { label: "Carton of 24", value: 24 },
  { label: "Pack of 30", value: 30 },
  { label: "Carton of 36", value: 36 },
  { label: "Carton of 48", value: 48 },
  { label: "Carton of 50", value: 50 },
  { label: "Carton of 100", value: 100 },
  { label: "Bag", value: 1 },
];

interface StaffName {
  id: string;
  name: string;
}

interface Props {
  warehouse: Warehouse;
  products: Product[];
  staff: StaffName[];
  currentQty: Record<string, number>; // product_id -> qty in this warehouse
  defaultProductId?: string;
  defaultDirection?: "in" | "out";
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustStockModal({
  warehouse,
  products,
  staff,
  currentQty,
  defaultProductId,
  defaultDirection = "in",
  onClose,
  onSuccess,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [direction, setDirection] = useState<"in" | "out">(defaultDirection);
  const [productId, setProductId] = useState(defaultProductId || "");
  const [stockUnit, setStockUnit] = useState(STOCK_UNITS[0]);
  const [quantity, setQuantity] = useState("");
  const [movedBy, setMovedBy] = useState("");
  const [notes, setNotes] = useState("");

  const totalUnits = (parseInt(quantity) || 0) * stockUnit.value;
  const available = productId ? currentQty[productId] || 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError("Select a product");
      return;
    }
    if (totalUnits <= 0) {
      setError("Enter a quantity");
      return;
    }
    if (direction === "out" && totalUnits > available) {
      setError(`Only ${available} units available in ${warehouse.name}`);
      return;
    }
    setLoading(true);
    setError("");

    const businessId = await getBusinessId(supabase);
    const delta = direction === "in" ? totalUnits : -totalUnits;

    // Update or create the warehouse_stock row
    const { data: existing } = await supabase
      .from("warehouse_stock")
      .select("id, quantity")
      .eq("warehouse_id", warehouse.id)
      .eq("product_id", productId)
      .maybeSingle();

    let stockError;
    if (existing) {
      ({ error: stockError } = await supabase
        .from("warehouse_stock")
        .update({
          quantity: existing.quantity + delta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id));
    } else {
      ({ error: stockError } = await supabase.from("warehouse_stock").insert({
        business_id: businessId,
        warehouse_id: warehouse.id,
        product_id: productId,
        quantity: delta,
      }));
    }

    if (stockError) {
      setError(stockError.message);
      setLoading(false);
      return;
    }

    // Record the movement
    const { error: moveError } = await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: productId,
      type: direction,
      from_warehouse_id: direction === "out" ? warehouse.id : null,
      to_warehouse_id: direction === "in" ? warehouse.id : null,
      quantity: totalUnits,
      moved_by: movedBy,
      notes: notes.trim(),
    });

    if (moveError) {
      setError(moveError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Adjust stock — {warehouse.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection("in")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                direction === "in"
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ArrowDownToLine size={16} /> Stock in
            </button>
            <button
              type="button"
              onClick={() => setDirection("out")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                direction === "out"
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ArrowUpFromLine size={16} /> Stock out
            </button>
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {productId && (
              <p className="text-xs text-gray-400 mt-1">
                Currently {available.toLocaleString()} units in {warehouse.name}
              </p>
            )}
          </div>

          {/* Quantity calculator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={stockUnit.label}
                onChange={(e) => {
                  const unit = STOCK_UNITS.find(
                    (u) => u.label === e.target.value,
                  );
                  if (unit) setStockUnit(unit);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
              >
                {STOCK_UNITS.map((unit) => (
                  <option key={unit.label} value={unit.label}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="How many?"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            {totalUnits > 0 && (
              <div className="mt-2 bg-[var(--color-primary-light)] rounded-xl px-4 py-3">
                <p className="text-sm text-[var(--color-primary)] font-medium">
                  {quantity} x {stockUnit.label} ={" "}
                  {totalUnits.toLocaleString()} units{" "}
                  {direction === "in" ? "added" : "removed"}
                </p>
              </div>
            )}
          </div>

          {/* Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Done by
            </label>
            <select
              value={movedBy}
              onChange={(e) => setMovedBy(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
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
              placeholder="e.g. New delivery from supplier"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : direction === "in" ? (
                "Add stock"
              ) : (
                "Remove stock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
