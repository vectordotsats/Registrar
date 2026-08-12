"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { timeAgo } from "@/lib/utils";
import { Loader2, Calendar, X, Warehouse, Package } from "lucide-react";

interface ProductRecord {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  low_stock_threshold: number;
}

interface WarehouseRecord {
  id: string;
  name: string;
}

interface StockRecord {
  warehouse_id: string;
  product_id: string;
  quantity: number;
}

interface MovementRecord {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  moved_by: string;
  notes: string;
  created_at: string;
  product: { name: string } | null;
  from_warehouse: { name: string } | null;
  to_warehouse: { name: string } | null;
}

const MOVEMENT_STYLES: Record<string, { label: string; color: string }> = {
  in: { label: "Stock in", color: "text-green-600 bg-green-50" },
  out: { label: "Stock out", color: "text-red-600 bg-red-50" },
  transfer: { label: "Transfer", color: "text-blue-600 bg-blue-50" },
  adjustment: { label: "Adjustment", color: "text-amber-600 bg-amber-50" },
};

export default function ReportsContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [quickPeriod, setQuickPeriod] = useState<
    "today" | "week" | "month" | "all" | "custom"
  >("today");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [stockRows, setStockRows] = useState<StockRecord[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const [productsRes, warehousesRes, stockRes, movementsRes] =
        await Promise.all([
          supabase
            .from("products")
            .select("id, name, category, selling_price, low_stock_threshold")
            .order("name"),
          supabase.from("warehouses").select("id, name").order("name"),
          supabase
            .from("warehouse_stock")
            .select("warehouse_id, product_id, quantity"),
          supabase
            .from("stock_movements")
            .select(
              "id, product_id, type, quantity, moved_by, notes, created_at, product:products(name), from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(name)",
            )
            .order("created_at", { ascending: false }),
        ]);
      setProducts((productsRes.data as unknown as ProductRecord[]) || []);
      setWarehouses((warehousesRes.data as unknown as WarehouseRecord[]) || []);
      setStockRows((stockRes.data as unknown as StockRecord[]) || []);
      setMovements((movementsRes.data as unknown as MovementRecord[]) || []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const setQuick = (period: "today" | "week" | "month" | "all") => {
    setQuickPeriod(period);
    setShowDatePicker(false);
    const now = new Date();
    const td = now.toISOString().split("T")[0];
    if (period === "today") {
      setStartDate(td);
      setEndDate(td);
    } else if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(td);
    } else if (period === "month") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(td);
    } else {
      setStartDate("2020-01-01");
      setEndDate(td);
    }
  };

  const getDateLabel = () => {
    if (startDate === endDate)
      return new Date(startDate).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    const s = new Date(startDate).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
    });
    const e = new Date(endDate).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${s} — ${e}`;
  };

  // ---- Stock aggregations (current state, not date-filtered) ----

  // stock[warehouse_id][product_id] = qty
  const stockMap: Record<string, Record<string, number>> = {};
  stockRows.forEach((row) => {
    if (!stockMap[row.warehouse_id]) stockMap[row.warehouse_id] = {};
    stockMap[row.warehouse_id][row.product_id] = row.quantity;
  });

  const totalByProduct: Record<string, number> = {};
  stockRows.forEach((row) => {
    totalByProduct[row.product_id] =
      (totalByProduct[row.product_id] || 0) + row.quantity;
  });

  const totalUnits = Object.values(totalByProduct).reduce((s, q) => s + q, 0);

  const lowStockItems = products
    .map((p) => ({ ...p, total: totalByProduct[p.id] || 0 }))
    .filter((p) => p.total <= p.low_stock_threshold)
    .sort((a, b) => a.total - b.total);

  const warehouseSummaries = warehouses.map((w) => {
    const wStock = stockMap[w.id] || {};
    const units = Object.values(wStock).reduce((s, q) => s + q, 0);
    const productCount = Object.keys(wStock).filter(
      (pid) => wStock[pid] > 0,
    ).length;
    return { ...w, units, productCount };
  });

  // ---- Movement aggregations (date-filtered) ----

  const filteredMovements = movements.filter((m) => {
    const d = new Date(m.created_at).toISOString().split("T")[0];
    return d >= startDate && d <= endDate;
  });

  const movedIn = filteredMovements
    .filter((m) => m.type === "in")
    .reduce((s, m) => s + m.quantity, 0);
  const movedOut = filteredMovements
    .filter((m) => m.type === "out")
    .reduce((s, m) => s + m.quantity, 0);
  const transfers = filteredMovements.filter((m) => m.type === "transfer");

  const movedByProduct: Record<string, { name: string; qty: number; count: number }> =
    {};
  filteredMovements.forEach((m) => {
    const name = m.product?.name || "Unknown";
    if (!movedByProduct[name])
      movedByProduct[name] = { name, qty: 0, count: 0 };
    movedByProduct[name].qty += m.quantity;
    movedByProduct[name].count++;
  });
  const mostMoved = Object.values(movedByProduct)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );

  return (
    <div>
      {/* Period controls (apply to movements) */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(["today", "week", "month", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setQuick(p)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${quickPeriod === p ? "bg-[var(--color-primary)] text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {p === "today"
              ? "Today"
              : p === "week"
                ? "7 days"
                : p === "month"
                  ? "30 days"
                  : "All"}
          </button>
        ))}
        <button
          onClick={() => {
            setShowDatePicker(!showDatePicker);
            if (!showDatePicker) setQuickPeriod("custom");
          }}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${quickPeriod === "custom" ? "bg-[var(--color-primary)] text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          <Calendar size={16} />
        </button>
      </div>

      {showDatePicker && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickPeriod("custom");
              }}
              max={endDate}
              className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickPeriod("custom");
              }}
              min={startDate}
              max={todayStr}
              className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            />
          </div>
          <span className="text-xs text-[var(--color-primary)] font-medium">
            {getDateLabel()}
          </span>
          <button
            onClick={() => {
              setShowDatePicker(false);
              setQuick("month");
            }}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total units in stock</p>
          <p className="text-xl font-bold text-gray-900">
            {totalUnits.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Stock in (period)</p>
          <p className="text-xl font-bold text-green-600">
            +{movedIn.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Stock out (period)</p>
          <p className="text-xl font-bold text-red-600">
            -{movedOut.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Transfers (period)</p>
          <p className="text-xl font-bold text-blue-600">{transfers.length}</p>
          <p className="text-xs text-gray-400">
            {filteredMovements.length} total movements
          </p>
        </div>
      </div>

      {/* Stock levels across warehouses */}
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Stock levels across warehouses
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {warehouseSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center sm:col-span-2 xl:col-span-3">
            <p className="text-sm text-gray-400">No warehouses yet</p>
          </div>
        ) : (
          warehouseSummaries.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-2xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Warehouse
                  size={15}
                  className="text-[var(--color-primary)]"
                />
                <p className="text-sm font-semibold text-gray-900">{w.name}</p>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {w.units.toLocaleString()}{" "}
                <span className="text-xs font-normal text-gray-400">units</span>
              </p>
              <p className="text-xs text-gray-400">
                {w.productCount} products
              </p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Most moved products */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Most moved products
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {mostMoved.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No movements in this period
              </p>
            ) : (
              <div>
                {mostMoved.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center text-xs font-medium text-[var(--color-primary)]">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.count} movement{p.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {p.qty.toLocaleString()} units
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low stock items */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Low stock items
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                All items sufficiently stocked
              </p>
            ) : (
              <div>
                {lowStockItems.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Package
                        size={15}
                        className="text-gray-300 flex-shrink-0"
                      />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${p.total <= 0 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"}`}
                    >
                      {p.total <= 0 ? "Out of stock" : `${p.total} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Movement history */}
        <div className="xl:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Movement history
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {filteredMovements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No movements in this period
              </p>
            ) : (
              <div>
                {filteredMovements.slice(0, 25).map((m) => {
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
                      className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${style.color}`}
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
                            {m.notes ? ` · ${m.notes}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {m.quantity.toLocaleString()} units
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
      </div>
    </div>
  );
}
