"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId } from "@/lib/utils";
import type { Warehouse } from "@/types";
import { X, Loader2, Trash2 } from "lucide-react";

interface Props {
  warehouse?: Warehouse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WarehouseModal({ warehouse, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: warehouse?.name || "",
    location: warehouse?.location || "",
  });

  const isEdit = !!warehouse;

  const handleDelete = async () => {
    if (!warehouse) return;
    setDeleting(true);
    setError("");
    const { error: dbError } = await supabase
      .from("warehouses")
      .delete()
      .eq("id", warehouse.id);
    if (dbError) {
      setError(dbError.message);
      setDeleting(false);
    } else {
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Warehouse name is required");
      return;
    }
    setLoading(true);
    setError("");

    let dbError;
    if (isEdit) {
      ({ error: dbError } = await supabase
        .from("warehouses")
        .update({ name: form.name.trim(), location: form.location.trim() })
        .eq("id", warehouse.id));
    } else {
      const businessId = await getBusinessId(supabase);
      ({ error: dbError } = await supabase.from("warehouses").insert({
        business_id: businessId,
        name: form.name.trim(),
        location: form.location.trim(),
      }));
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit warehouse" : "Add warehouse"}
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
              Warehouse name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Main Store"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
              placeholder="e.g. Onitsha Main Market"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
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
              <Trash2 size={15} /> Delete this warehouse
            </button>
          )}

          {isEdit && confirmingDelete && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-3">
              <p className="text-sm text-red-600">
                Delete <span className="font-semibold">{warehouse?.name}</span>?
                All its stock records will be removed. This cannot be undone.
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
                "Add warehouse"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
