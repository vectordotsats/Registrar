"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId } from "@/lib/utils";
import type { Product } from "@/types";
import { X, Loader2, Trash2 } from "lucide-react";

interface Props {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    setError("");
    const { error: dbError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);
    if (dbError) {
      setError(dbError.message);
      setDeleting(false);
    } else {
      onSuccess();
    }
  };

  const [form, setForm] = useState({
    name: product?.name || "",
    category: product?.category || "General",
    cost_price: product ? String(product.cost_price) : "",
    selling_price: product ? String(product.selling_price) : "",
    low_stock_threshold: product ? String(product.low_stock_threshold) : "10",
  });

  const isEdit = !!product;

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "General",
      cost_price: parseFloat(form.cost_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
    };

    let dbError;
    if (isEdit) {
      ({ error: dbError } = await supabase
        .from("products")
        .update(payload)
        .eq("id", product.id));
    } else {
      const businessId = await getBusinessId(supabase);
      ({ error: dbError } = await supabase
        .from("products")
        .insert({ business_id: businessId, ...payload }));
    }

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
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit product" : "Add new product"}
          </h2>
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
              placeholder="e.g. Bag of Rice (50kg)"
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
              placeholder="e.g. Grains, Beverages, Electronics"
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
                placeholder="0"
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
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
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
            <p className="text-xs text-gray-400 mt-1">
              Alert when total stock across warehouses drops below this number
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">
              Stock quantities are managed per warehouse. Use &quot;Stock
              in&quot; on a warehouse to add stock for this product.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {isEdit && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 cursor-pointer"
            >
              <Trash2 size={15} /> Delete this product
            </button>
          )}

          {isEdit && confirmingDelete && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-3">
              <p className="text-sm text-red-600">
                Delete <span className="font-semibold">{product?.name}</span>?
                Its stock records and movement history will also be removed.
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {deleting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Yes, delete
                </button>
              </div>
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
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
