"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Truck,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: <LayoutDashboard size={22} /> },
  { label: "Warehouses", href: "/warehouses", icon: <Warehouse size={22} /> },
  { label: "Products", href: "/products", icon: <Package size={22} /> },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: <Truck size={22} />,
    adminOnly: true,
  },
  { label: "Account", href: "/settings", icon: <Settings size={22} /> },
];

export default function Sidebar({
  userName,
  userRole,
  businessName,
}: {
  userName: string;
  userRole: UserRole;
  businessName: string;
}) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  // Hide admin-only items (e.g. Suppliers) from staff.
  const visibleNav = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin",
  );

  return (
    <>
      {/* ---- Desktop Sidebar ---- */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img
                src="/icon.svg"
                alt="Registrar"
                className="w-9 h-9 rounded-xl"
              />
              <div>
                <h1 className="text-base font-bold text-gray-900 truncate">
                  {businessName}
                </h1>
                <p className="text-[11px] text-gray-400 leading-none">
                  Powered by Registrar
                </p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
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
          </div>
        </div>
      </aside>

      {/* ---- Mobile/Tablet Bottom Navigation ---- */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around py-2">
          {visibleNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 min-w-[60px]"
              >
                <div
                  className={`p-1.5 rounded-2xl transition-all ${
                    active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-gray-400"
                  }`}
                >
                  {item.icon}
                </div>
                <span
                  className={`text-[10px] font-medium leading-tight ${
                    active ? "text-[var(--color-primary)]" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
