"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, formatDate } from "@/lib/utils";
import type { Customer } from "@/types";
import { Search, Plus, Loader2, Users, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  const totalDebt = customers.reduce((sum, c) => sum + c.total_debt, 0);
  const debtorsCount = customers.filter((c) => c.total_debt > 0).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage registered customers and track debt
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          Add customer
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total customers</p>
          <p className="text-xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Customers owing</p>
          <p className="text-xl font-bold text-amber-600">{debtorsCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total outstanding</p>
          <p className="text-xl font-bold text-red-600">
            {formatNaira(totalDebt)}
          </p>
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
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Customer list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Users size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {search ? "No customers match your search" : "No customers yet"}
            </p>
            {!search && (
              <p className="text-gray-400 text-xs mt-1">
                Click &quot;Add customer&quot; to get started
              </p>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="w-full flex items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {customer.phone || "No phone"} — Added{" "}
                    {formatDate(customer.created_at)}
                  </p>
                </div>

                {/* Debt */}
                <div className="text-right flex-shrink-0">
                  {customer.total_debt > 0 ? (
                    <>
                      <p className="text-sm font-semibold text-red-600">
                        {formatNaira(customer.total_debt)}
                      </p>
                      <p className="text-xs text-red-400">owed</p>
                    </>
                  ) : (
                    <p className="text-sm text-green-600 font-medium">Clear</p>
                  )}
                </div>

                <ChevronRight
                  size={18}
                  className="text-gray-300 flex-shrink-0"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

// ---- Add Customer Modal ----
function AddCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Customer name is required");
      return;
    }
    setLoading(true);
    setError("");

    const { error: dbError } = await supabase.from("customers").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    });

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
            Add new customer
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
              Customer name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Alhaji Musa"
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
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="e.g. Shop 15, Alaba Market"
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
                  Adding...
                </>
              ) : (
                "Add customer"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
