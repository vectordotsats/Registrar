"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId } from "@/lib/utils";
import type { Product, Warehouse } from "@/types";
import { X, Loader2, ArrowRight } from "lucide-react";

interface StaffName {
  id: string;
  name: string;
}

interface Props {
  warehouses: Warehouse[];
  products: Product[];
  staff: StaffName[];
  // stock[warehouse_id][product_id] = qty
  stock: Record<string, Record<string, number>>;
  defaultFromId?: string;
  defaultProductId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({
  warehouses,
  products,
  staff,
  stock,
  defaultFromId,
  defaultProductId,
  onClose,
  onSuccess,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fromId, setFromId] = useState(defaultFromId || "");
  const [toId, setToId] = useState("");
  const [productId, setProductId] = useState(defaultProductId || "");
  const [quantity, setQuantity] = useState("");
  const [movedBy, setMovedBy] = useState("");
  const [notes, setNotes] = useState("");

  const qty = parseInt(quantity) || 0;
  const available =
    fromId && productId ? stock[fromId]?.[productId] || 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !productId) {
      setError("Select source, destination, and product");
      return;
    }
    if (fromId === toId) {
      setError("Source and destination must be different");
      return;
    }
    if (qty <= 0) {
      setError("Enter a quantity");
      return;
    }
    if (qty > available) {
      setError(`Only ${available} units available in the source warehouse`);
      return;
    }
    setLoading(true);
    setError("");

    const businessId = await getBusinessId(supabase);

    // Decrement source
    const { data: fromRow } = await supabase
      .from("warehouse_stock")
      .select("id, quantity")
      .eq("warehouse_id", fromId)
      .eq("product_id", productId)
      .maybeSingle();

    if (!fromRow || fromRow.quantity < qty) {
      setError("Not enough stock in the source warehouse");
      setLoading(false);
      return;
    }

    const { error: decError } = await supabase
      .from("warehouse_stock")
      .update({
        quantity: fromRow.quantity - qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fromRow.id);

    if (decError) {
      setError(decError.message);
      setLoading(false);
      return;
    }

    // Increment destination
    const { data: toRow } = await supabase
      .from("warehouse_stock")
      .select("id, quantity")
      .eq("warehouse_id", toId)
      .eq("product_id", productId)
      .maybeSingle();

    let incError;
    if (toRow) {
      ({ error: incError } = await supabase
        .from("warehouse_stock")
        .update({
          quantity: toRow.quantity + qty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", toRow.id));
    } else {
      ({ error: incError } = await supabase.from("warehouse_stock").insert({
        business_id: businessId,
        warehouse_id: toId,
        product_id: productId,
        quantity: qty,
      }));
    }

    if (incError) {
      // Roll back the source decrement so stock isn't lost
      await supabase
        .from("warehouse_stock")
        .update({ quantity: fromRow.quantity })
        .eq("id", fromRow.id);
      setError(incError.message);
      setLoading(false);
      return;
    }

    // Record the movement
    const { error: moveError } = await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: productId,
      type: "transfer",
      from_warehouse_id: fromId,
      to_warehouse_id: toId,
      quantity: qty,
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
            Transfer stock
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* From / To */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From *
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                required
                className="w-full px-3 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
              >
                <option value="">Select...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <ArrowRight size={18} className="text-gray-400 mb-3.5" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To *
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                required
                className="w-full px-3 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
              >
                <option value="">Select...</option>
                {warehouses
                  .filter((w) => w.id !== fromId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
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
            {fromId && productId && (
              <p className="text-xs text-gray-400 mt-1">
                {available.toLocaleString()} units available in source
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity (units) *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="1"
              max={available || undefined}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
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
              placeholder="e.g. Restocking shop floor"
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
                  Transferring...
                </>
              ) : (
                "Transfer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
