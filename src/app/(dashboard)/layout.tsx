import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { getSessionUser } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One gate for every page under (dashboard). Each page also scopes its own
  // queries by user id, so this is the outer guard rather than the only one.
  const user = hasDb ? await getSessionUser() : null;
  if (hasDb && !user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-base-0">
      <Sidebar
        account={
          user
            ? {
                email: user.email,
                name: user.name,
                plan: user.plan,
                role: user.role,
                isGuest: user.isGuest,
              }
            : null
        }
      />
      <main className="flex-1">{children}</main>
      <CommandPalette />
    </div>
  );
}
