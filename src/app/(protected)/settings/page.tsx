"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  X,
  UserPlus,
  Mail,
  Lock,
  User,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const [staffRes, accountsRes] = await Promise.all([
      supabase.from("staff_members").select("*").order("name"),
      supabase
        .from("users")
        .select("id, name, email, role, is_active")
        .order("name"),
    ]);
    setStaff(staffRes.data || []);
    setAccounts((accountsRes.data as UserAccount[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addStaffName = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    const businessId = await getBusinessId(supabase);
    const exists = staff.some(
      (s) => s.name.toLowerCase() === newName.trim().toLowerCase(),
    );
    if (exists) {
      setError("This name already exists");
      setAdding(false);
      return;
    }
    const { error: dbError } = await supabase.from("staff_members").insert({
      business_id: businessId,
      name: newName.trim(),
    });
    if (dbError) {
      setError(dbError.message);
    } else {
      setNewName("");
      fetchData();
    }
    setAdding(false);
  };

  const toggleStaff = async (id: string, currentlyActive: boolean) => {
    await supabase
      .from("staff_members")
      .update({ is_active: !currentlyActive })
      .eq("id", id);
    fetchData();
  };

  const deleteStaff = async (id: string, name: string) => {
    const confirmed = window.confirm(`Remove "${name}" from staff list?`);
    if (!confirmed) return;
    await supabase.from("staff_members").delete().eq("id", id);
    fetchData();
  };

  const deleteAccount = async (account: UserAccount) => {
    if (account.role === "admin") {
      alert("Cannot delete admin accounts");
      return;
    }
    const confirmed = window.confirm(
      `Delete login account for "${account.name}" (${account.email})? They will no longer be able to log in.`,
    );
    if (!confirmed) return;
    const res = await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_user_id: account.id }),
    });
    if (res.ok) {
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete account");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] relative">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236C5CE7' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage staff and system access
            </p>
          </div>
        </div>

        {/* Two column grid on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Login Accounts Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Card header with gradient accent */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[var(--color-primary-light)] to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
                    <UserPlus size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Login accounts
                    </h2>
                    <p className="text-xs text-gray-500">
                      System access management
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm cursor-pointer shadow-sm"
                >
                  <Plus size={16} /> Create
                </button>
              </div>
            </div>

            {/* Accounts list */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Users size={24} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">No accounts yet</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Create one to get started
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${
                            account.role === "admin"
                              ? "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {account.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {account.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            account.role === "admin"
                              ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {account.role}
                        </span>
                        {account.role !== "admin" && (
                          <button
                            onClick={() => deleteAccount(account)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer stat */}
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {accounts.length} total account
                {accounts.length !== 1 ? "s" : ""} —{" "}
                {accounts.filter((a) => a.role === "admin").length} admin,{" "}
                {accounts.filter((a) => a.role === "staff").length} staff
              </p>
            </div>
          </div>

          {/* Sales Staff Names Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shadow-sm">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Sales staff names
                  </h2>
                  <p className="text-xs text-gray-500">
                    Appears in &quot;who made this sale&quot; dropdown
                  </p>
                </div>
              </div>
            </div>

            {/* Quick add */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && addStaffName()}
                  placeholder="Enter staff name..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-gray-50/50"
                />
                <button
                  onClick={addStaffName}
                  disabled={adding || !newName.trim()}
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {adding ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}{" "}
                  Add
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            {/* Staff list */}
            <div className="flex-1">
              {staff.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Users size={24} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">No staff names added</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Add names for the sales dropdown
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shadow-sm ${
                            member.is_active
                              ? "bg-gradient-to-br from-gray-700 to-gray-900 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${member.is_active ? "text-gray-900" : "text-gray-400 line-through"}`}
                          >
                            {member.name}
                          </p>
                          {!member.is_active && (
                            <p className="text-xs text-gray-400">Deactivated</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleStaff(member.id, member.is_active)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            member.is_active
                              ? "bg-green-50 text-green-600 hover:bg-green-100 ring-1 ring-green-100"
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100 ring-1 ring-gray-100"
                          }`}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </button>
                        <button
                          onClick={() => deleteStaff(member.id, member.name)}
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

            {/* Footer stat */}
            <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {staff.filter((s) => s.is_active).length} active of{" "}
                {staff.length} total
              </p>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function CreateAccountModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create account");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Modal header with accent */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[var(--color-primary-light)] to-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
                <UserPlus size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create staff account
                </h2>
                <p className="text-xs text-gray-500">
                  They&apos;ll use these details to log in
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-gray-400" /> Full name
              </span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Emeka Obi"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-gray-400" /> Email address
              </span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="e.g. emeka@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-gray-400" /> Password
              </span>
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="At least 6 characters"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-gray-50/50"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Share these login details with the staff member
            </p>
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
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
