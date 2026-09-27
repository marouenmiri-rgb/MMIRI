import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account — AdGen" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user && !user.isGuest) redirect("/dashboard");
  return <AuthForm mode="signup" />;
}
