"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell, Plus, Search, Moon, Sun, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceOpt { id: string; name: string; role: string; }

export function Header({ workspaces, activeWsId, userName, notifications }: {
  workspaces: WorkspaceOpt[]; activeWsId: string | null; userName: string;
  notifications: { id: string; title: string; link: string | null; read: boolean; created_at: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"none" | "search" | "quick" | "notif" | "profile">("none");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen("none"); }
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open !== "search" || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults((await res.json()).results ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login"); router.refresh();
  }

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
  }

  const groups = results.reduce<Record<string, any[]>>((acc, r) => { (acc[r.type] ||= []).push(r); return acc; }, {});

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" ref={ref}>
      <button className="rounded p-2 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800" aria-label="Open navigation" onClick={() => (window as any).__openMobileNav?.()}><Menu className="h-5 w-5" /></button>
      {workspaces.length > 0 && (
        <select aria-label="Workspace selector" value={activeWsId ?? ""} onChange={e => { router.push(`/?ws=${e.target.value}`); router.refresh(); }}
          className="h-8 max-w-[160px] truncate rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      )}
      <div className="relative ml-auto w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen("search"); }} onFocus={() => setOpen("search")}
          placeholder="Search tasks, notes, sprints…" aria-label="Global search"
          className="h-9 w-full rounded-md border border-slate-300 bg-slate-50 pl-8 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900" />
        {open === "search" && Object.keys(groups).length > 0 && (
          <div className="absolute right-0 top-10 max-h-80 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {Object.entries(groups).map(([type, items]) => (
              <div key={type}>
                <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{type}</p>
                {items.map((it: any) => <Link key={it.id} href={it.href} onClick={() => setOpen("none")} className="block truncate rounded px-2 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-slate-800">{it.title}</Link>)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button aria-label="Quick add" onClick={() => setOpen(open === "quick" ? "none" : "quick")} className="rounded-md bg-indigo-600 p-2 text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /></button>
        {open === "quick" && (
          <div className="absolute right-0 top-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {[["New task", "/tasks?new=1"], ["New note", "/notes?new=1"], ["New event", "/calendar?new=1"], ["New scrum update", "/scrum?new=1"]].map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen("none")} className="block rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">{label}</Link>
            ))}
            {workspaces[0]?.role && ["owner", "admin", "team_lead"].includes(workspaces[0].role) && (
              <Link href="/sprints?new=1" onClick={() => setOpen("none")} className="block rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">New sprint</Link>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <button aria-label={`Notifications (${unread} unread)`} onClick={() => setOpen(open === "notif" ? "none" : "notif")} className="relative rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
        </button>
        {open === "notif" && (
          <div className="absolute right-0 top-10 max-h-80 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {notifications.length === 0 && <p className="p-2 text-sm text-slate-500">No notifications yet.</p>}
            {notifications.slice(0, 20).map(n => n.link ? (
              <Link key={n.id} href={n.link} onClick={() => setOpen("none")} className={`block rounded px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 ${n.read ? "text-slate-500" : "font-medium"}`}>{n.title}</Link>
            ) : (
              <span key={n.id} className={`block rounded px-2 py-1.5 text-xs ${n.read ? "text-slate-500" : "font-medium"}`}>{n.title}</span>
            ))}
          </div>
        )}
      </div>
      <button onClick={toggleTheme} aria-label="Toggle theme" className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Moon className="h-4 w-4 dark:hidden" /><Sun className="hidden h-4 w-4 dark:block" /></button>
      <div className="relative">
        <button aria-label="Profile menu" onClick={() => setOpen(open === "profile" ? "none" : "profile")} className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{(userName || "?")[0].toUpperCase()}</button>
        {open === "profile" && (
          <div className="absolute right-0 top-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="truncate px-3 py-2 text-xs font-medium text-slate-500">{userName}</p>
            <Link href="/settings" onClick={() => setOpen("none")} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><User className="h-4 w-4" />Profile</Link>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><LogOut className="h-4 w-4" />Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
