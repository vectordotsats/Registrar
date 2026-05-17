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

      const { data: profile } = await supabase
        .from("users")
        .select("name, role, business_id")
        .eq("id", user.id)
        .single();

      let businessName = "Registrar";
      if (profile?.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", profile.business_id)
          .single();
        if (biz) businessName = biz.name;
      }

      setAuth({
        userName: profile?.name || user.email || "User",
        userRole: profile?.role || "staff",
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
