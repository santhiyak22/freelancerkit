"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/clients": "Clients",
    "/invoices": "Invoices",
    "/quotations": "Quotations",
    "/payments": "Payments",
    "/settings": "Settings",
  };

  const title = titles[pathname] || "Workspace";

  return (
    <div className="app-shell">
      <AppSidebar />

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{title}</strong>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
