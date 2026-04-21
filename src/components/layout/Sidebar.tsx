"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  LogOut,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  { label: "Inventory", href: "/inventory", icon: <Package size={20} /> },
  { label: "New sale", href: "/sales/new", icon: <ShoppingCart size={20} /> },
  { label: "Sales", href: "/sales", icon: <ClipboardList size={20} /> },
  { label: "Customers", href: "/customers", icon: <Users size={20} /> },
  {
    label: "Reports",
    href: "/reports",
    icon: <FileText size={20} />,
    adminOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings size={20} />,
    adminOnly: true,
  },
];

export default function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin",
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
            <span className="text-white text-base font-bold">R</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Registrar</h1>
            <p className="text-[11px] text-gray-400 leading-none">
              Business management
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={20} />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-sm border border-gray-200"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 h-full bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200">
        {sidebarContent}
      </aside>
    </>
  );
}
