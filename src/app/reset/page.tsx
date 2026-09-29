import type { Metadata } from "next";
import { ResetForm } from "@/components/AuthFlows";

export const metadata: Metadata = { title: "Choose a new password — AdGen" };
export const dynamic = "force-dynamic";

export default function ResetPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <ResetForm token={searchParams.token ?? ""} />;
}
