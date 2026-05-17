"use client";

import Sidebar from "@/components/layout/Sidebar";
import ConnectionStatus from "@/components/ui/ConnectionStatus";
import { useAuth } from "@/components/layout/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { userName, userRole, businessName } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <ConnectionStatus />
      <Sidebar
        userName={userName}
        userRole={userRole}
        businessName={businessName}
      />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pb-24 lg:pb-8">{children}</div>
      </main>
    </div>
  );
}
