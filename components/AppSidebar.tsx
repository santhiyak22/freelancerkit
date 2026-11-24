"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  Wallet,
  Settings,
  Sparkles,
  ArrowUpRight,
  MoreHorizontal,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Quotations", path: "/quotations", icon: FileCheck },
  { label: "Payments", path: "/payments", icon: Wallet },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <button
        className="mobile-menu"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {sidebarOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            F<span>.</span>
          </div>

          <div className="brand-name">
            freelancer<span>kit</span>
            <small>BUSINESS SUITE</small>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;

            return (
              <button
                key={item.path}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => {
                  setSidebarOpen(false);
                  router.push(item.path);
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Sparkles size={18} />
            </div>

            <strong>Grow your business</strong>

            <p>Keep all your freelance work organized in one place.</p>

            <button onClick={() => router.push("/settings")}>
              Explore settings <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="profile">
            <div className="profile-avatar">AK</div>

            <div className="profile-info">
              <strong>Alex Kim</strong>
              <span>Free workspace</span>
            </div>

            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>
    </>
  );
}
