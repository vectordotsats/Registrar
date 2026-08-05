"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Moon,
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
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
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
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [accountsMsg, setAccountsMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
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

  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    // Section is driven by the URL, so the sidebar Settings icon (which goes to
    // /settings) always returns to the settings home, wherever you came from.
    const valid: Section[] = [
      "profile",
      "business",
      "password",
      "accounts",
      "staff",
      "reports",
    ];
    const section = searchParams.get("section") as Section;
    setActiveSection(valid.includes(section) ? section : null);
  }, [searchParams]);

  useEffect(() => {
    fetchData();

    setDarkMode(document.documentElement.classList.contains("dark"));
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
      setResetMsg("Password must be at least 6 characters");
      return;
    }
    setResetLoading(true);
    setResetMsg("");
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
      setResetPasswordId(null);
      setResetPasswordValue("");
      setAccountsMsg({ type: "success", text: "Password reset successfully" });
    } else {
      const data = await res.json();
      setResetMsg(data.error || "Failed to reset password");
    }
    setResetLoading(false);
  };

  const deleteAccount = async (account: UserAccount) => {
    if (account.role === "admin") return;
    setConfirmAction({
      title: "Delete account?",
      message: `Delete login account for "${account.name}"? They will no longer be able to log in.`,
      onConfirm: async () => {
        const res = await fetch("/api/staff", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_user_id: account.id }),
        });
        if (res.ok) {
          fetchData();
          setAccountsMsg({
            type: "success",
            text: `Account for "${account.name}" deleted`,
          });
        } else {
          setAccountsMsg({ type: "error", text: "Failed to delete account" });
        }
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
      desc: "Stock levels and movement analysis",
      icon: <FileText size={20} />,
      show: isAdmin,
    },
  ].filter((item) => item.show);

  // Section header with back button
  const SectionHeader = ({ title, desc }: { title: string; desc?: string }) => (
    <div className="mb-6">
      <button
        onClick={() => {
          router.push("/settings");
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
            <p className="text-sm text-gray-400">
              {profileEmail.includes("@registrar.internal")
                ? `@${profileEmail.split(".")[0]}`
                : profileEmail}
            </p>
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
              onClick={() => router.push(`/settings?section=${item.id}`)}
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

        {/* Dark mode toggle */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-xl mt-4">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                <Moon size={20} />
              </div>
              <p className="text-sm font-medium text-gray-900">Dark mode</p>
            </div>
            <button
              onClick={() => {
                const isDark = !darkMode;
                setDarkMode(isDark);
                document.documentElement.classList.toggle("dark", isDark);
                localStorage.setItem("registrar_dark_mode", isDark.toString());
              }}
              className={`w-12 h-7 rounded-full transition-colors cursor-pointer ${
                typeof window !== "undefined" &&
                document.documentElement.classList.contains("dark")
                  ? "bg-[var(--color-primary)]"
                  : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
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

          {profileEmail.includes("@registrar.internal") ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={`@${profileEmail.split(".")[0]}`}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
          )}
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

        {accountsMsg && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
              accountsMsg.type === "success"
                ? "bg-green-50 text-green-600 border-green-100"
                : "bg-red-50 text-red-600 border-red-100"
            }`}
          >
            {accountsMsg.text}
          </div>
        )}

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
                          setResetMsg("");
                          setAccountsMsg(null);
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
                <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2 flex-wrap">
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
                  {resetMsg && (
                    <p className="w-full text-xs text-red-600">{resetMsg}</p>
                  )}
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
          desc='Names shown in the "Done by" dropdown — add or remove staff under Login Accounts'
        />

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Users size={32} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No staff yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add staff under Login Accounts
              </p>
            </div>
          ) : (
            <div>
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium bg-gradient-to-br from-gray-700 to-gray-900 text-white">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 px-1">
          {staff.length} {staff.length === 1 ? "name" : "names"}
        </p>
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
