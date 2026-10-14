"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Sun, CalendarDays, ListTodo, Calendar, Repeat, MessagesSquare, StickyNote, Users, ShieldCheck, Settings, Kanban, X } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-day", label: "My Day", icon: Sun },
  { href: "/my-week", label: "My Week", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/sprints", label: "Sprints", icon: Repeat },
  { href: "/scrum", label: "Daily Scrum", icon: MessagesSquare },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/team", label: "Team", icon: Users },
  { href: "/users", label: "User Management", icon: ShieldCheck, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isAdmin, collapsed, onToggle, mobileOpen, onCloseMobile }: { isAdmin: boolean; collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onCloseMobile: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter(i => !i.adminOnly || isAdmin);
  const nav = (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div className="mb-2 flex items-center gap-2 px-2 pt-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white"><Kanban className="h-4 w-4" /></div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight">SprintDesk</span>}
        <button onClick={onCloseMobile} className="ml-auto rounded p-1 hover:bg-slate-100 md:hidden lg:block" aria-label="Close menu"><X className="h-4 w-4" /></button>
      </div>
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onCloseMobile}
          className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === href || pathname.startsWith(href + "/") ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}
          title={collapsed ? label : undefined}>
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </Link>
      ))}
      <button onClick={onToggle} className="mt-auto hidden rounded-md px-3 py-2 text-xs text-slate-400 hover:bg-slate-100 lg:block">{collapsed ? "Expand" : "Collapse"}</button>
    </nav>
  );
  return (
    <>
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block", collapsed ? "w-14" : "w-56")}>{nav}</aside>
      {mobileOpen && <div className="fixed inset-0 z-40 md:hidden">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onCloseMobile} />
        <aside className="absolute left-0 top-0 h-full w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">{nav}</aside>
      </div>}
    </>
  );
}
