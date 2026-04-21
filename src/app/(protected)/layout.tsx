import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the user's profile from our users table
  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const userName = profile?.name || user.email || "User";
  const userRole: UserRole = profile?.role || "staff";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userName={userName} userRole={userRole} />
      <main className="lg:ml-60 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
