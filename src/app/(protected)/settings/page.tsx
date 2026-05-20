"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { getBusinessId } from "@/lib/utils";
import ReportsContent from "@/components/ui/ReportsContent";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  User,
  Building2,
  Lock,
  Users,
  UserPlus,
  ChevronRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  X,
  LogOut,
  Shield,
  Key,
  FileText,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

type Section =
  | null
  | "profile"
  | "business"
  | "password"
  | "accounts"
  | "staff"
  | "reports";

export default function SettingsPage() {
  const supabase = createClient();
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [businessNameEdit, setBusinessNameEdit] = useState("");
  const [userRole, setUserRole] = useState("staff");

  // UI states
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase
        .from("users")
        .select("name, email, role, business_id")
        .eq("id", user.id)
        .single();
      if (me) {
        setProfileName(me.name);
        setProfileEmail(me.email);
        setUserRole(me.role);
        if (me.business_id) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("name")
            .eq("id", me.business_id)
            .single();
          if (biz) setBusinessNameEdit(biz.name);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("section") === "reports") setActiveSection("reports");
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/staff/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_profile", name: profileName }),
    });
    setMsg(res.ok ? "Name updated successfully" : "Failed to update");
    setSaving(false);
  };

  const saveBusinessName = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/staff/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_business",
        businessName: businessNameEdit,
      }),
    });
    setMsg(res.ok ? "Business name updated" : "Failed to update");
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/staff/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", newPassword }),
    });
    if (res.ok) {
      setMsg("Password changed successfully");
      setNewPassword("");
    } else setMsg("Failed to change password");
    setSaving(false);
  };

  const resetStaffPassword = async (staffUserId: string) => {
    if (resetPasswordValue.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    const res = await fetch("/api/staff/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reset_staff_password",
        staffUserId,
        newPassword: resetPasswordValue,
      }),
    });
    if (res.ok) {
      alert("Password reset successfully");
      setResetPasswordId(null);
      setResetPasswordValue("");
    } else {
      const data = await res.json();
      alert(data.error || "Failed");
    }
    setResetLoading(false);
  };

  const addStaffName = async () => {
    if (!newStaffName.trim()) return;
    setAddingStaff(true);
    setStaffError("");
    const exists = staff.some(
      (s) => s.name.toLowerCase() === newStaffName.trim().toLowerCase(),
    );
    if (exists) {
      setStaffError("Already exists");
      setAddingStaff(false);
      return;
    }
    const businessId = await getBusinessId(supabase);
    await supabase
      .from("staff_members")
      .insert({ business_id: businessId, name: newStaffName.trim() });
    setNewStaffName("");
    fetchData();
    setAddingStaff(false);
  };

  const toggleStaff = async (id: string, active: boolean) => {
    await supabase
      .from("staff_members")
      .update({ is_active: !active })
      .eq("id", id);
    fetchData();
  };

  const deleteStaff = async (id: string, name: string) => {
    setConfirmAction({
      title: "Remove staff?",
      message: `Remove "${name}" from the sales staff list?`,
      onConfirm: async () => {
        await supabase.from("staff_members").delete().eq("id", id);
        fetchData();
        setConfirmAction(null);
      },
    });
  };

  const deleteAccount = async (account: UserAccount) => {
    if (account.role === "admin") {
      alert("Cannot delete admin accounts");
      return;
    }
    setConfirmAction({
      title: "Delete account?",
      message: `Delete login account for "${account.name}"? They will no longer be able to log in.`,
      onConfirm: async () => {
        const res = await fetch("/api/staff", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_user_id: account.id }),
        });
        if (res.ok) fetchData();
        else alert("Failed to delete");
        setConfirmAction(null);
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const isAdmin = userRole === "admin";

  // Menu items
  const menuItems = [
    {
      id: "profile" as Section,
      label: "My Profile",
      desc: "Name and email",
      icon: <User size={20} />,
      show: true,
    },
    {
      id: "business" as Section,
      label: "Business Details",
      desc: "Business name and info",
      icon: <Building2 size={20} />,
      show: isAdmin,
    },
    {
      id: "password" as Section,
      label: "Change Password",
      desc: "Update your login password",
      icon: <Lock size={20} />,
      show: true,
    },
    {
      id: "accounts" as Section,
      label: "Login Accounts",
      desc: `${accounts.length} account${accounts.length !== 1 ? "s" : ""}`,
      icon: <Shield size={20} />,
      show: isAdmin,
    },
    {
      id: "staff" as Section,
      label: "Sales Staff Names",
      desc: `${staff.filter((s) => s.is_active).length} active`,
      icon: <Users size={20} />,
      show: isAdmin,
    },
    {
      id: "reports" as Section,
      label: "Reports",
      desc: "Revenue, sales, and debt analysis",
      icon: <FileText size={20} />,
      show: isAdmin,
    },
  ].filter((item) => item.show);

  // Section header with back button
  const SectionHeader = ({ title, desc }: { title: string; desc?: string }) => (
    <div className="mb-6">
      <button
        onClick={() => {
          setActiveSection(null);
          setMsg("");
        }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 cursor-pointer"
      >
        <ArrowLeft size={18} /> Back to settings
      </button>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {desc && <p className="text-gray-500 text-sm mt-1">{desc}</p>}
    </div>
  );

  // ---- MAIN MENU ----
  if (activeSection === null) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your account and business settings
          </p>
        </div>

        {/* User card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 flex items-center gap-4 max-w-xl">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center text-xl font-bold shadow-sm">
            {profileName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {profileName}
            </p>
            <p className="text-sm text-gray-400">{profileEmail}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)] capitalize">
              {userRole}
            </span>
          </div>
        </div>

        {/* Menu list */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-xl">
          {menuItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors cursor-pointer ${i !== menuItems.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-xl mt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-red-50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
              <LogOut size={20} />
            </div>
            <p className="text-sm font-medium text-red-600">Log out</p>
          </button>
        </div>

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  // ---- MY PROFILE ----
  if (activeSection === "profile") {
    return (
      <div className="max-w-xl">
        <SectionHeader title="My Profile" desc="Update your personal details" />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  username: e.target.value.toLowerCase().replace(/\s/g, ""),
                }))
              }
              placeholder="e.g. emeka"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Staff will use this to log in (no spaces)
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileEmail}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email changes coming soon
            </p>
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  // ---- BUSINESS DETAILS ----
  if (activeSection === "business") {
    return (
      <div className="max-w-xl">
        <SectionHeader
          title="Business Details"
          desc="Your business information"
        />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business name
            </label>
            <input
              type="text"
              value={businessNameEdit}
              onChange={(e) => setBusinessNameEdit(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <button
            onClick={saveBusinessName}
            disabled={saving}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  // ---- CHANGE PASSWORD ----
  if (activeSection === "password") {
    return (
      <div className="max-w-xl">
        <SectionHeader
          title="Change Password"
          desc="Update your login password"
        />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          {msg && (
            <p
              className={`text-sm ${msg.includes("success") ? "text-green-600" : "text-red-600"}`}
            >
              {msg}
            </p>
          )}
          <button
            onClick={changePassword}
            disabled={saving || !newPassword}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {saving ? "Changing..." : "Change password"}
          </button>
        </div>

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  // ---- LOGIN ACCOUNTS ----
  if (activeSection === "accounts") {
    return (
      <div className="max-w-xl">
        <SectionHeader
          title="Login Accounts"
          desc="Manage who can log into the system"
        />

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-medium cursor-pointer shadow-sm"
        >
          <UserPlus size={18} /> Create staff account
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {accounts.map((account) => (
            <div key={account.id}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${account.role === "admin" ? "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {account.email.includes("@registrar.internal")
                        ? `@${account.email.split(".")[0]}`
                        : account.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${account.role === "admin" ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "bg-gray-100 text-gray-500"}`}
                  >
                    {account.role}
                  </span>
                  {account.role !== "admin" && (
                    <>
                      <button
                        onClick={() => {
                          setResetPasswordId(
                            resetPasswordId === account.id ? null : account.id,
                          );
                          setResetPasswordValue("");
                        }}
                        className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Reset password"
                      >
                        <Key size={15} />
                      </button>
                      <button
                        onClick={() => deleteAccount(account)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {resetPasswordId === account.id && (
                <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="flex-1 px-3 py-2 rounded-lg border border-amber-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={() => resetStaffPassword(account.id)}
                    disabled={resetLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-60"
                  >
                    {resetLoading ? "..." : "Reset"}
                  </button>
                  <button
                    onClick={() => setResetPasswordId(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3 px-1">
          {accounts.length} total —{" "}
          {accounts.filter((a) => a.role === "admin").length} admin,{" "}
          {accounts.filter((a) => a.role === "staff").length} staff
        </p>

        {showCreateModal && (
          <CreateAccountModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchData();
            }}
          />
        )}

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  // ---- SALES STAFF NAMES ----
  if (activeSection === "staff") {
    return (
      <div className="max-w-xl">
        <SectionHeader
          title="Sales Staff Names"
          desc='Names in the "who made this sale" dropdown'
        />

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newStaffName}
            onChange={(e) => {
              setNewStaffName(e.target.value);
              setStaffError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && addStaffName()}
            placeholder="Enter staff name..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <button
            onClick={addStaffName}
            disabled={addingStaff || !newStaffName.trim()}
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-4 rounded-xl text-sm disabled:opacity-60 cursor-pointer"
          >
            {addingStaff ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}{" "}
            Add
          </button>
        </div>
        {staffError && (
          <p className="text-xs text-red-500 mb-3">{staffError}</p>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Users size={32} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No staff names added</p>
            </div>
          ) : (
            <div>
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${member.is_active ? "bg-gradient-to-br from-gray-700 to-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <p
                      className={`text-sm font-medium ${member.is_active ? "text-gray-900" : "text-gray-400 line-through"}`}
                    >
                      {member.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStaff(member.id, member.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${member.is_active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
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

        <p className="text-xs text-gray-400 mt-3 px-1">
          {staff.filter((s) => s.is_active).length} active of {staff.length}{" "}
          total
        </p>

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  if (activeSection === "reports") {
    return (
      <div>
        <SectionHeader title="Reports" desc="Business performance overview" />
        <ReportsContent />

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={confirmAction.onConfirm}
            onClose={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  return null;
}

// ---- Create Account Modal ----
function CreateAccountModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
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
        username: form.username.trim(),
        password: form.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Create staff account
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
              placeholder="e.g. Emeka"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="e.g. emeka@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div> */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              placeholder="At least 6 characters"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Share these details with the staff member
            </p>
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
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
