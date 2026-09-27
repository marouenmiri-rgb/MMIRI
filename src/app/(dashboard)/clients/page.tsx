import { TopBar } from "@/components/TopBar";
import { ClientsBoard } from "./ClientsBoard";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  return (
    <>
      <TopBar
        eyebrow="Agency"
        title="Clients"
        subtitle="Every store you run ads for, what they pay you, and the revenue you can prove you drove."
      />
      <ClientsBoard />
    </>
  );
}
