"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  const colors = {
    danger: {
      icon: "bg-red-50 text-red-500",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: "bg-amber-50 text-amber-500",
      button: "bg-amber-500 hover:bg-amber-600",
    },
    default: {
      icon: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
      button: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]",
    },
  };

  const c = colors[variant];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 text-center">
          <div
            className={`w-14 h-14 rounded-full ${c.icon} flex items-center justify-center mx-auto mb-4`}
          >
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-medium cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 ${c.button}`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
