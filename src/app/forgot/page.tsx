import type { Metadata } from "next";
import { ForgotForm } from "@/components/AuthFlows";

export const metadata: Metadata = { title: "Reset your password — AdGen" };

export default function ForgotPage() {
  return <ForgotForm />;
}
