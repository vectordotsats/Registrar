"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      // Hide the "back online" banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const goOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline && !showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff size={16} />
          You&apos;re offline — changes won&apos;t be saved until you
          reconnect.
        </div>
      )}

      {/* Back online banner */}
      {isOnline && showBanner && (
        <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <Wifi size={16} />
          Back online
        </div>
      )}
    </div>
  );
}
