import type { Metadata } from "next";
import { VerifyView } from "@/components/AuthFlows";

export const metadata: Metadata = { title: "Confirm your email — AdGen" };
export const dynamic = "force-dynamic";

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <VerifyView token={searchParams.token ?? ""} />;
}
