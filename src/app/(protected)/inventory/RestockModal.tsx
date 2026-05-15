"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, getBusinessId } from "@/lib/utils";
import { X, Loader2, PackagePlus } from "lucide-react";
import type { Product } from "@/types";

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

interface Props {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RestockModal({ product, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stockUnit, setStockUnit] = useState(STOCK_UNITS[0]);
  const [stockQuantity, setStockQuantity] = useState("");

  const totalUnits = (parseInt(stockQuantity) || 0) * stockUnit.value;
  const newStockLevel = product.quantity_in_stock + totalUnits;

  const handleUnitChange = (label: string) => {
    const unit = STOCK_UNITS.find((u) => u.label === label);
    if (unit) setStockUnit(unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalUnits <= 0) {
      setError("Enter a valid restock quantity");
      return;
    }
    setLoading(true);
    setError("");

    const businessId = await getBusinessId(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Update product stock
    const { error: updateError } = await supabase
      .from("products")
      .update({ quantity_in_stock: newStockLevel })
      .eq("id", product.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Log the restock in inventory_log
    await supabase.from("inventory_log").insert({
      business_id: businessId,
      product_id: product.id,
      created_by: user?.id,
      logged_by: "",
      type: "restock",
      quantity_change: totalUnits,
      stock_after: newStockLevel,
      reason: `Restocked +${totalUnits} units (${stockQuantity} x ${stockUnit.label})`,
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <PackagePlus size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Restock</h2>
              <p className="text-xs text-gray-500">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current stock display */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Current stock</p>
              <p className="text-lg font-bold text-gray-900">
                {product.quantity_in_stock} units
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Selling price</p>
              <p className="text-sm font-medium text-gray-700">
                {formatNaira(product.selling_price)}
              </p>
            </div>
          </div>

          {/* Restock quantity with unit calculator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How much are you adding?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={stockUnit.label}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
              >
                {STOCK_UNITS.map((unit) => (
                  <option key={unit.label} value={unit.label}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="How many?"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {totalUnits > 0 && (
              <div className="mt-2 bg-green-50 rounded-xl px-4 py-3">
                <p className="text-sm text-green-700 font-medium">
                  +{totalUnits} units → New stock: {newStockLevel} units
                </p>
              </div>
            )}
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
              disabled={loading || totalUnits <= 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Restocking...
                </>
              ) : (
                `Add ${totalUnits > 0 ? totalUnits + " units" : ""}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
