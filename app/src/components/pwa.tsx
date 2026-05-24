"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/auth";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PwaInit() {
  const { user, householdId } = useAuth();

  useEffect(() => {
    if (!user || !householdId || !VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (cancelled) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const existing = await reg.pushManager.getSubscription();
        if (existing || cancelled) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
        if (cancelled) return;

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId, subscription: sub.toJSON() }),
        });
      } catch {
        // SW unavailable (HTTP in dev, unsupported browser) — silently skip
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, householdId]);

  return null;
}
