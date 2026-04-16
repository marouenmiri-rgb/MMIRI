import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-base-0">
      <Sidebar />
      <main className="flex-1">{children}</main>
      <CommandPalette />
    </div>
  );
}
