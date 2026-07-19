"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatDate, getBusinessId } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Search, Plus, Loader2, Truck, X, Edit2, Trash2 } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
}

export default function SuppliersPage() {
  const supabase = createClient();
  const router = useRouter();
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  // Suppliers are admin-only — send staff back to the dashboard.
  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search) ||
      (s.notes || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (supplier: Supplier) => {
    await supabase.from("suppliers").delete().eq("id", supplier.id);
    setDeleting(null);
    fetchSuppliers();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">
            The people and businesses you buy or import goods from
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          Add supplier
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total suppliers</p>
          <p className="text-xl font-bold text-gray-900">{suppliers.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, phone or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Truck size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {search ? "No suppliers match your search" : "No suppliers yet"}
            </p>
            {!search && (
              <p className="text-gray-400 text-xs mt-1">
                Click &quot;Add supplier&quot; to add your first one
              </p>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((supplier) => (
              <div
                key={supplier.id}
                onClick={() => setEditing(supplier)}
                className="w-full flex items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {supplier.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {supplier.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {supplier.phone || "No phone"}
                    {supplier.notes ? ` — ${supplier.notes}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-300 hidden sm:block mr-1">
                    Added {formatDate(supplier.created_at)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(supplier);
                    }}
                    className="p-2 text-gray-300 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(supplier);
                    }}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <SupplierModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSuppliers();
          }}
        />
      )}
      {editing && (
        <SupplierModal
          supplier={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            fetchSuppliers();
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete supplier?"
          message={`Delete "${deleting.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ---- Add / Edit Supplier Modal ----
function SupplierModal({
  supplier,
  onClose,
  onSuccess,
}: {
  supplier?: Supplier;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name: supplier?.name || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    notes: supplier?.notes || "",
  });

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    };

    let dbError;
    if (isEdit) {
      ({ error: dbError } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", supplier.id));
    } else {
      const businessId = await getBusinessId(supabase);
      ({ error: dbError } = await supabase
        .from("suppliers")
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit supplier" : "Add new supplier"}
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
              Supplier name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Dangote Distributors"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="e.g. Aba, Abia State"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What they supply{" "}
              <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="e.g. Rice, sugar, cooking oil"
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
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add supplier"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
