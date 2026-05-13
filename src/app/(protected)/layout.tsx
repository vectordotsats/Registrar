import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import type { UserRole } from "@/types";
import ConnectionStatus from "@/components/ui/ConnectionStatus";

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
    .select("name, role, business_id")
    .eq("id", user?.id)
    .single();

  let businessName = "Registrar";
  if (profile?.business_id) {
    const { data: business } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", profile.business_id)
      .single();
    if (business) businessName = business.name;
  }

  const userName = profile?.name || user.email || "User";
  const userRole: UserRole = profile?.role || "staff";

  return (
    <div className="min-h-screen bg-gray-50">
      <ConnectionStatus />
      <Sidebar
        userName={userName}
        userRole={userRole}
        businessName={businessName}
      />
      <main className="lg:ml-60 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
