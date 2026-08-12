"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatQty, timeAgo } from "@/lib/utils";
import {
  Package,
  Warehouse,
  AlertTriangle,
  History,
  PackageX,
  Loader2,
} from "lucide-react";

const MOVEMENT_STYLES: Record<string, { label: string; color: string }> = {
  in: { label: "Stock in", color: "text-green-600 bg-green-50" },
  out: { label: "Stock out", color: "text-red-600 bg-red-50" },
  transfer: { label: "Transfer", color: "text-blue-600 bg-blue-50" },
  adjustment: { label: "Adjustment", color: "text-amber-600 bg-amber-50" },
};

interface ProductRow {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  low_stock_threshold: number;
  unit?: string;
}
interface Movement {
  id: string;
  type: string;
  quantity: number;
  moved_by: string;
  created_at: string;
  product: { name: string; unit?: string } | null;
  from_warehouse: { name: string } | null;
  to_warehouse: { name: string } | null;
}

export default function DashboardPage() {
  const supabase = createClient();
  const { userName, userRole } = useAuth();
  const isAdmin = userRole === "admin";

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [stockRows, setStockRows] = useState<
    { warehouse_id: string; product_id: string; quantity: number }[]
  >([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [productsRes, warehousesRes, stockRes, movementsRes] =
        await Promise.all([
          supabase
            .from("products")
            .select(
              "id, name, category, selling_price, low_stock_threshold, unit",
            ),
          supabase.from("warehouses").select("id, name"),
          supabase
            .from("warehouse_stock")
            .select("warehouse_id, product_id, quantity"),
          supabase
            .from("stock_movements")
            .select(
              "id, type, quantity, moved_by, created_at, product:products(name, unit), from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(name)",
            )
            .order("created_at", { ascending: false })
            .limit(6),
        ]);
      setProducts((productsRes.data as ProductRow[]) || []);
      setWarehouses(warehousesRes.data || []);
      setStockRows(stockRes.data || []);
      setMovements((movementsRes.data as unknown as Movement[]) || []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  // Aggregate stock per product across warehouses
  const totalByProduct: Record<string, number> = {};
  stockRows.forEach((row) => {
    totalByProduct[row.product_id] =
      (totalByProduct[row.product_id] || 0) + row.quantity;
  });

  const topStocked = products
    .map((p) => ({ ...p, total: totalByProduct[p.id] || 0 }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const lowStockProducts = products
    .map((p) => ({ ...p, total: totalByProduct[p.id] || 0 }))
    .filter((p) => p.total <= p.low_stock_threshold && p.total > 0);
  const outOfStockProducts = products.filter(
    (p) => (totalByProduct[p.id] || 0) <= 0,
  );

  // Everything at or below its threshold (combined across all warehouses),
  // most depleted first. Out-of-stock included.
  const restockList = products
    .map((p) => ({ ...p, total: totalByProduct[p.id] || 0 }))
    .filter((p) => p.total <= p.low_stock_threshold)
    .sort((a, b) => a.total - b.total);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {userName || "there"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here&apos;s your stock overview
        </p>
        {isAdmin && (
          <a
            href="/settings?section=reports"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium hover:underline"
          >
            View Reports →
          </a>
        )}
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
              <Warehouse size={16} className="text-[var(--color-primary)]" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Warehouses</p>
          <p className="text-2xl font-bold text-gray-900">
            {warehouses.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <Package size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Products in stock</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Low stock</p>
          <p className="text-2xl font-bold text-amber-600">
            {lowStockProducts.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {outOfStockProducts.length} out of stock
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top 5 most stocked items */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Most stocked items
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {topStocked.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No stock recorded yet
              </p>
            ) : (
              <div>
                {topStocked.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center text-xs font-medium text-[var(--color-primary)]">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatQty(p.total, p.unit)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent movements */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recent movements
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {movements.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <History size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No movements yet</p>
              </div>
            ) : (
              <div>
                {movements.map((m) => {
                  const style =
                    MOVEMENT_STYLES[m.type] || MOVEMENT_STYLES.adjustment;
                  const route =
                    m.type === "transfer"
                      ? `${m.from_warehouse?.name || "?"} → ${m.to_warehouse?.name || "?"}`
                      : m.type === "in"
                        ? m.to_warehouse?.name || "?"
                        : m.from_warehouse?.name || "?";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${style.color}`}
                        >
                          {style.label}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.product?.name || "Unknown product"}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {route}
                            {m.moved_by ? ` — ${m.moved_by}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatQty(m.quantity, m.product?.unit)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {timeAgo(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Low / out of stock — combined across all warehouses */}
        {restockList.length > 0 && (
          <div className="xl:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Running low
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {restockList.map((p) => {
                const out = p.total <= 0;
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 ${
                      out
                        ? "border-red-200 bg-red-50/40"
                        : "border-amber-200 bg-amber-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {p.category}
                        </p>
                      </div>
                      {out ? (
                        <PackageX
                          size={18}
                          className="text-red-500 flex-shrink-0"
                        />
                      ) : (
                        <AlertTriangle
                          size={18}
                          className="text-amber-500 flex-shrink-0"
                        />
                      )}
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        out ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {out
                        ? "Out of stock"
                        : `${formatQty(p.total, p.unit)} left`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      across all warehouses
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
