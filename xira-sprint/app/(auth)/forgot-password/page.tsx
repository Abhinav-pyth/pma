"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/api/auth/callback?next=/reset-password` });
    setLoading(false);
    if (error) return toast.error(error.message);
    setDone(true);
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="mb-2 text-lg font-semibold">Reset password</h1>
      {done ? <p className="text-sm text-slate-600">If that email is registered, a reset link has been sent. Check your inbox.</p> : (
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
      <p className="mt-3 text-xs text-slate-500"><Link href="/login" className="underline">Back to sign in</Link></p>
    </div>
  );
}
