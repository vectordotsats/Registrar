"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/types";

interface AuthContextType {
  userName: string;
  userRole: UserRole;
  businessName: string;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  userName: "",
  userRole: "staff",
  businessName: "Registrar",
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [auth, setAuth] = useState<AuthContextType>({
    userName: "",
    userRole: "staff",
    businessName: "Registrar",
    loading: true,
  });

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Load dark mode preference
      const saved = localStorage.getItem("registrar_dark_mode");
      if (saved === "true") {
        document.documentElement.classList.add("dark");
      }

      const { data: profile } = await supabase
        .from("users")
        .select("name, role, business_id")
        .eq("id", user.id)
        .single();

      // Auto-logout after 12 hours of inactivity
      let inactivityTimer: NodeJS.Timeout;
      const TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours

      const resetTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }, TIMEOUT);
      };

      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("touchstart", resetTimer);
      resetTimer();

      let businessName = "Registrar";
      if (profile?.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", profile.business_id)
          .single();
        if (biz) businessName = biz.name;
      }

      // Prefer the role stamped in auth metadata at account creation — it's the
      // reliable source and doesn't depend on the DB trigger for public.users.
      const metaRole = (user.user_metadata?.role ||
        user.app_metadata?.role) as UserRole | undefined;

      setAuth({
        userName: profile?.name || user.email || "User",
        userRole: metaRole || profile?.role || "staff",
        businessName,
        loading: false,
      });
    };
    load();
  }, [supabase]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-9 h-9 bg-[var(--color-primary)] rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-white text-base font-bold">R</span>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
