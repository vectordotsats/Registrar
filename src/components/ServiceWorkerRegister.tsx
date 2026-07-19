"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      // Register the service worker only in production (PWA / offline).
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    } else {
      // In development, make sure no old service worker is caching stale
      // chunks (it causes hydration mismatches). Remove it and clear caches.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
    }
  }, []);

  return null;
}
