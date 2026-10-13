"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(d: any) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(d);
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);
    toast.success("Welcome back");
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div><h1 className="text-lg font-semibold">Sign in</h1><p className="text-xs text-slate-500">Manage sprints, tasks and daily scrums in one place.</p></div>
      {params.get("error") && <p className="rounded bg-red-50 p-2 text-xs text-red-700" role="alert">Could not complete sign-in. Please try again.</p>}
      <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" placeholder="you@team.dev" {...register("email")} />{errors.email && <p className="text-xs text-red-600">{errors.email.message as string}</p>}</div>
      <div className="space-y-1"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" {...register("password")} />{errors.password && <p className="text-xs text-red-600">{errors.password.message as string}</p>}</div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign in"}</Button>
      <div className="flex justify-between text-xs text-slate-500">
        <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline">Create account</Link>
      </div>
    </form>
  );
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
