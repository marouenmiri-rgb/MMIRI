import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Offline — AdGen" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-8 text-[22px] font-semibold tracking-tight text-ink-hi">
          You&apos;re offline
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-mid">
          Making a video needs a connection — the product page has to be read
          and the video rendered on the server. Anything you already downloaded
          is still on your device.
        </p>
        <Link href="/make" className="btn-primary mt-6 w-full">
          Try again
        </Link>
      </div>
    </main>
  );
}
