"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { canManageMembers } from "@/lib/permissions";

export function Shell({ children, workspaces, activeWsId, userName, notifications, role }: {
  children: React.ReactNode;
  workspaces: { id: string; name: string; role: string }[];
  activeWsId: string | null; userName: string; role: string;
  notifications: { id: string; title: string; link: string | null; read: boolean; created_at: string }[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  (window as any).__openMobileNav = () => setMobileOpen(true);
  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={canManageMembers(role as any)} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header workspaces={workspaces} activeWsId={activeWsId} userName={userName} notifications={notifications} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
