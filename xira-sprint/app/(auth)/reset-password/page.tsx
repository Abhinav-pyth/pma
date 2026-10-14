"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResetPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    router.push("/dashboard"); router.refresh();
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      <div className="space-y-1"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} /></div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving…" : "Update password"}</Button>
    </form>
  );
}
