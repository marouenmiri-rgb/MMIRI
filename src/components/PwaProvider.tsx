"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the service worker, and offers installation when the browser says
 * it is possible.
 *
 * Installing matters more here than on most web apps: an installed icon is
 * what puts AdGen in the Android share sheet, so a product page can be sent
 * straight to it from the browser instead of copying a link between apps.
 */
export function PwaProvider() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Registered after load so it never competes with the first render.
      const onLoad = () =>
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      if (document.readyState === "complete") onLoad();
      else window.addEventListener("load", onLoad, { once: true });
    }

    try {
      setDismissed(localStorage.getItem("adgen-install-dismissed") === "1");
    } catch {
      setDismissed(false);
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setInstall(e as InstallEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!install || dismissed) return null;

  function close() {
    setDismissed(true);
    try {
      localStorage.setItem("adgen-install-dismissed", "1");
    } catch {
      // Private mode — it simply reappears next visit.
    }
  }

  async function accept() {
    const e = install;
    setInstall(null);
    await e?.prompt();
    await e?.userChoice.catch(() => undefined);
  }

  return (
    <div
      className="popover fixed inset-x-4 z-[60] mx-auto max-w-sm p-4 sm:left-auto sm:right-5"
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      role="dialog"
      aria-label="Install AdGen"
    >
      <div className="flex items-start gap-3">
        <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink-hi">
            Add AdGen to your phone
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-mid">
            Share a product page straight from your browser and get the video
            back — no copying links between apps.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn-primary flex-1 py-2 text-[13px]" onClick={accept}>
          Install
        </button>
        <button className="btn-ink py-2 text-[13px]" onClick={close}>
          Not now
        </button>
      </div>
    </div>
  );
}
