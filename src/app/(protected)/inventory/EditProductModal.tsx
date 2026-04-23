"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { X, Loader2 } from "lucide-react";
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

export default function EditProductModal({
  product,
  onClose,
  onSuccess,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: product.name,
    category: product.category,
    cost_price: product.cost_price.toString(),
    selling_price: product.selling_price.toString(),
    low_stock_threshold: product.low_stock_threshold.toString(),
  });

  // Stock calculator — defaults to Piece with current stock count
  const [stockUnit, setStockUnit] = useState(STOCK_UNITS[0]);
  const [stockQuantity, setStockQuantity] = useState(
    product.quantity_in_stock.toString(),
  );

  const totalUnits = (parseInt(stockQuantity) || 0) * stockUnit.value;

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitChange = (label: string) => {
    const unit = STOCK_UNITS.find((u) => u.label === label);
    if (unit) setStockUnit(unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.name.trim()) {
      setError("Product name is required");
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("products")
      .update({
        name: form.name.trim(),
        category: form.category.trim() || "General",
        cost_price: parseFloat(form.cost_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        quantity_in_stock: totalUnits,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      })
      .eq("id", product.id);

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Edit product</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost price (&#8358;){" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                value={form.cost_price}
                onChange={(e) => updateField("cost_price", e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling price (&#8358;)
              </label>
              <input
                type="number"
                value={form.selling_price}
                onChange={(e) => updateField("selling_price", e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {form.cost_price && form.selling_price && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">
                Profit per unit:{" "}
                <span className="font-medium text-green-600">
                  &#8358;
                  {(
                    parseFloat(form.selling_price) - parseFloat(form.cost_price)
                  ).toLocaleString()}
                </span>
                {parseFloat(form.cost_price) > 0 && (
                  <span className="text-gray-400 ml-2">
                    (
                    {Math.round(
                      ((parseFloat(form.selling_price) -
                        parseFloat(form.cost_price)) /
                        parseFloat(form.cost_price)) *
                        100,
                    )}
                    % margin)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Stock calculator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update stock
              <span className="text-gray-400 font-normal ml-2">
                (currently {product.quantity_in_stock} units)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={stockUnit.label}
                onChange={(e) => handleUnitChange(e.target.value)}
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
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="How many?"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            {parseInt(stockQuantity) > 0 && stockUnit.value > 1 && (
              <div className="mt-2 bg-[var(--color-primary-light)] rounded-xl px-4 py-3">
                <p className="text-sm text-[var(--color-primary)] font-medium">
                  {stockQuantity} x {stockUnit.label} ={" "}
                  {totalUnits.toLocaleString()} units total
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low stock alert (units)
            </label>
            <input
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) =>
                updateField("low_stock_threshold", e.target.value)
              }
              placeholder="10"
              min="0"
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
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
