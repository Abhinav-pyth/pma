"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signupSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(signupSchema) });

  async function onSubmit(d: any) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email: d.email, password: d.password, options: { data: { full_name: d.fullName }, emailRedirectTo: `${location.origin}/api/auth/callback?next=/setup-workspace` } });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) { toast.success("Account created"); router.push("/setup-workspace"); router.refresh(); }
    else setSent(true);
  }

  if (sent) return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="mb-2 text-lg font-semibold">Check your email</h1>
      <p className="text-slate-600">We sent a verification link to your address. Confirm it, then <Link className="text-indigo-600 underline" href="/login">sign in</Link>.</p>
    </div>
  );
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div><h1 className="text-lg font-semibold">Create your account</h1><p className="text-xs text-slate-500">Free for small teams. No credit card.</p></div>
      <div className="space-y-1"><Label htmlFor="fullName">Full name</Label><Input id="fullName" {...register("fullName")} />{errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message as string}</p>}</div>
      <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register("email")} />{errors.email && <p className="text-xs text-red-600">{errors.email.message as string}</p>}</div>
      <div className="space-y-1"><Label htmlFor="password">Password</Label><Input id="password" type="password" {...register("password")} />{errors.password && <p className="text-xs text-red-600">{errors.password.message as string}</p>}</div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating…" : "Sign up"}</Button>
      <p className="text-center text-xs text-slate-500">Already have an account? <Link href="/login" className="text-indigo-600 underline">Sign in</Link></p>
    </form>
  );
}
