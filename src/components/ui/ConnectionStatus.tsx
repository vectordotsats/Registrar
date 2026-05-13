"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      // Trigger sync of pending sales
      syncPendingSales();
      // Hide the "back online" banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const goOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Check for pending sales on mount
    checkPendingCount();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const checkPendingCount = async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction("pending_sales", "readonly");
      const store = tx.objectStore("pending_sales");
      const count = await promisifyRequest(store.count());
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  };

  const syncPendingSales = async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction("pending_sales", "readonly");
      const store = tx.objectStore("pending_sales");
      const allSales = await promisifyRequest(store.getAll());

      if (allSales.length === 0) return;

      setSyncing(true);
      setPendingCount(allSales.length);

      // Dispatch sync event for the sales page to handle
      window.dispatchEvent(new CustomEvent("sync-pending-sales"));

      // Recheck count after a delay
      setTimeout(() => {
        checkPendingCount();
        setSyncing(false);
      }, 3000);
    } catch {
      setSyncing(false);
    }
  };

  // Don't show anything if online and no banner needed and no pending
  if (isOnline && !showBanner && pendingCount === 0 && !syncing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff size={16} />
          You&apos;re offline — sales will be saved and synced when you
          reconnect.
        </div>
      )}

      {/* Back online banner */}
      {isOnline && showBanner && (
        <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <Wifi size={16} />
          Back online
          {syncing && (
            <span className="flex items-center gap-1">
              — <Loader2 size={14} className="animate-spin" /> Syncing{" "}
              {pendingCount} pending sale{pendingCount !== 1 ? "s" : ""}...
            </span>
          )}
        </div>
      )}

      {/* Pending sales indicator (persistent until synced) */}
      {isOnline && !showBanner && pendingCount > 0 && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Syncing {pendingCount} pending sale{pendingCount !== 1 ? "s" : ""}...
        </div>
      )}
    </div>
  );
}

// ---- IndexedDB helpers ----

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("registrar_offline", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("pending_sales")) {
        db.createObjectStore("pending_sales", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains("cached_products")) {
        db.createObjectStore("cached_products", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cached_customers")) {
        db.createObjectStore("cached_customers", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cached_staff")) {
        db.createObjectStore("cached_staff", { keyPath: "id" });
      }
    };
  });
}

export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
