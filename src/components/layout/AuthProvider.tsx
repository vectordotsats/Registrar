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
      // Read the session locally (no network round-trip). The login token
      // already carries the user's role, name and business_id.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Dark mode preference (local)
      if (localStorage.getItem("registrar_dark_mode") === "true") {
        document.documentElement.classList.add("dark");
      }

      const meta = user.user_metadata || {};
      const metaRole = (meta.role ||
        user.app_metadata?.role ||
        "staff") as UserRole;
      const businessId = meta.business_id as string | undefined;

      // Render the app shell immediately from the token — no blocking queries.
      setAuth({
        userName: (meta.name as string) || user.email || "User",
        userRole: metaRole,
        businessName: "Registrar",
        loading: false,
      });

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

      // Business name — fetch in the background and slot it in when ready.
      if (businessId) {
        supabase
          .from("businesses")
          .select("name")
          .eq("id", businessId)
          .single()
          .then(({ data: biz }) => {
            if (biz?.name)
              setAuth((prev) => ({ ...prev, businessName: biz.name }));
          });
      }

      // Onboarding guard (owners only) — background; rare redirect.
      if (metaRole === "admin") {
        supabase
          .from("users")
          .select("has_onboarded")
          .eq("id", user.id)
          .single()
          .then(({ data: onboard }) => {
            if (
              onboard &&
              onboard.has_onboarded === false &&
              window.location.pathname !== "/welcome"
            ) {
              window.location.href = "/welcome";
            }
          });
      }
    };
    load();
  }, [supabase]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <img
          src="/icon-512-nobg.png"
          alt="Registrar"
          className="w-20 h-20 animate-pulse"
        />
      </div>
    );
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
