import { redirect } from "next/navigation";
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  redirect(token ? `/setup-workspace?invite=${token}` : "/setup-workspace");
}
