"use client";

import type { Product } from "@/types";
import { X, MapPin, Warehouse as WarehouseIcon, PackageX } from "lucide-react";

export interface ProductLocation {
  id: string;
  name: string;
  location: string;
  quantity: number;
}

export default function ProductLocationsModal({
  product,
  locations,
  onClose,
}: {
  product: Product;
  locations: ProductLocation[];
  onClose: () => void;
}) {
  const stocked = locations
    .filter((l) => l.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);
  const total = stocked.reduce((s, l) => s + l.quantity, 0);
  const unitLabel =
    product.unit && product.unit.trim() ? product.unit.trim() : "units";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium">Where is it?</p>
            <h2 className="text-lg font-semibold text-gray-900">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Total */}
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-3xl font-bold text-gray-900">
              {total.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">
              {unitLabel}
              {product.pack_size && product.pack_size > 1
                ? ` · ${(total * product.pack_size).toLocaleString()} pieces`
                : ""}{" "}
              across{" "}
              {stocked.length === 1
                ? "1 warehouse"
                : `${stocked.length} warehouses`}
            </span>
          </div>

          {stocked.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <PackageX size={36} className="text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                Not stocked in any warehouse yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Use &quot;Stock in&quot; on a warehouse to add this product
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stocked.map((loc) => {
                const pct = total > 0 ? Math.round((loc.quantity / total) * 100) : 0;
                return (
                  <div key={loc.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                          <WarehouseIcon
                            size={14}
                            className="text-[var(--color-primary)]"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {loc.name}
                          </p>
                          {loc.location && (
                            <p className="text-[11px] text-gray-400 flex items-center gap-0.5 truncate">
                              <MapPin size={10} /> {loc.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {loc.quantity.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    {/* Distribution bar */}
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
