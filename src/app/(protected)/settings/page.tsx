"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Plus, Trash2, Loader2, Users, X } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("staff_members")
      .select("*")
      .order("name");
    setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const addStaff = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");

    const exists = staff.some(
      (s) => s.name.toLowerCase() === newName.trim().toLowerCase(),
    );
    if (exists) {
      setError("This name already exists");
      setAdding(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("staff_members")
      .insert({ name: newName.trim() });

    if (dbError) {
      setError(dbError.message);
    } else {
      setNewName("");
      fetchStaff();
    }
    setAdding(false);
  };

  const toggleStaff = async (id: string, currentlyActive: boolean) => {
    await supabase
      .from("staff_members")
      .update({ is_active: !currentlyActive })
      .eq("id", id);
    fetchStaff();
  };

  const deleteStaff = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Remove "${name}" from staff list? This cannot be undone.`,
    );
    if (!confirmed) return;

    await supabase.from("staff_members").delete().eq("id", id);
    fetchStaff();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your business settings
        </p>
      </div>

      {/* Staff Members Section */}
      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
                <Users size={18} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Staff members
                </h2>
                <p className="text-xs text-gray-500">
                  People who can be assigned to sales and payments
                </p>
              </div>
            </div>
          </div>

          {/* Add new staff */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && addStaff()}
                placeholder="Enter staff name..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <button
                onClick={addStaff}
                disabled={adding || !newName.trim()}
                className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {adding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Add
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>

          {/* Staff list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Users size={32} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">
                No staff members added yet
              </p>
            </div>
          ) : (
            <div>
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-6 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        member.is_active
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${member.is_active ? "text-gray-900" : "text-gray-400"}`}
                      >
                        {member.name}
                      </p>
                      {!member.is_active && (
                        <p className="text-xs text-gray-400">Deactivated</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle active/inactive */}
                    <button
                      onClick={() => toggleStaff(member.id, member.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        member.is_active
                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteStaff(member.id, member.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
