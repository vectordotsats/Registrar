"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatNaira, getStockStatus, timeAgo } from "@/lib/utils";
import type { Product, StockMovement, Warehouse, WarehouseStock } from "@/types";
import {
  Plus,
  Search,
  Package,
  Edit2,
  Loader2,
  Warehouse as WarehouseIcon,
  ArrowLeft,
  ArrowDownToLine,
  ArrowRightLeft,
  MapPin,
  History,
} from "lucide-react";
import WarehouseModal from "./WarehouseModal";
import AdjustStockModal from "./AdjustStockModal";
import TransferModal from "./TransferModal";

type Tab = "warehouses" | "movements";

interface StaffName {
  id: string;
  name: string;
}

const MOVEMENT_STYLES: Record<string, { label: string; color: string }> = {
  in: { label: "Stock in", color: "text-green-600 bg-green-50" },
  out: { label: "Stock out", color: "text-red-600 bg-red-50" },
  transfer: { label: "Transfer", color: "text-blue-600 bg-blue-50" },
  adjustment: { label: "Adjustment", color: "text-amber-600 bg-amber-50" },
};

export default function WarehousesPage() {
  const supabase = createClient();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("warehouses");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockRows, setStockRows] = useState<WarehouseStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [staff, setStaff] = useState<StaffName[]>([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [search, setSearch] = useState("");

  // Modals
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [modalProductId, setModalProductId] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    const [warehousesRes, productsRes, stockRes, movementsRes, staffRes] =
      await Promise.all([
        supabase.from("warehouses").select("*").order("name"),
        supabase.from("products").select("*").order("name"),
        supabase.from("warehouse_stock").select("*"),
        supabase
          .from("stock_movements")
          .select(
            "*, product:products(name), from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(name)",
          )
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("staff_members")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);
    setWarehouses(warehousesRes.data || []);
    setProducts(productsRes.data || []);
    setStockRows(stockRes.data || []);
    setMovements((movementsRes.data as unknown as StockMovement[]) || []);
    setStaff(staffRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Derived data ----

  // stock[warehouse_id][product_id] = qty
  const stockMap: Record<string, Record<string, number>> = {};
  stockRows.forEach((row) => {
    if (!stockMap[row.warehouse_id]) stockMap[row.warehouse_id] = {};
    stockMap[row.warehouse_id][row.product_id] = row.quantity;
  });

  const productById: Record<string, Product> = {};
  products.forEach((p) => (productById[p.id] = p));

  const isAdmin = userRole === "admin";

  const closeModals = () => {
    setShowWarehouseModal(false);
    setEditingWarehouse(null);
    setShowAdjustModal(false);
    setShowTransferModal(false);
    setModalProductId(undefined);
  };

  const onModalSuccess = () => {
    closeModals();
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // ============================================
  // Warehouse detail view
  // ============================================
  if (selectedWarehouse) {
    const wStock = stockMap[selectedWarehouse.id] || {};
    const rows = Object.entries(wStock)
      .map(([productId, qty]) => ({ product: productById[productId], qty }))
      .filter((r) => r.product)
      .filter((r) =>
        r.product.name.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => a.product.name.localeCompare(b.product.name));
    const totalUnits = Object.values(wStock).reduce((s, q) => s + q, 0);
    const stockValue = Object.entries(wStock).reduce(
      (s, [pid, qty]) => s + (productById[pid]?.selling_price || 0) * qty,
      0,
    );

    return (
      <div>
        <button
          onClick={() => {
            setSelectedWarehouse(null);
            setSearch("");
          }}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 cursor-pointer"
        >
          <ArrowLeft size={18} /> All warehouses
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedWarehouse.name}
            </h1>
            {selectedWarehouse.location && (
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                <MapPin size={14} /> {selectedWarehouse.location}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
            >
              <ArrowDownToLine size={16} /> Stock in / out
            </button>
            {warehouses.length > 1 && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm cursor-pointer"
              >
                <ArrowRightLeft size={16} /> Transfer
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Products stocked</p>
            <p className="text-xl font-bold text-gray-900">{rows.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total units</p>
            <p className="text-xl font-bold text-gray-900">
              {totalUnits.toLocaleString()}
            </p>
          </div>
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Stock value</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNaira(stockValue)}
              </p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>

        {/* Stock table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <Package size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                {search
                  ? "No products match your search"
                  : "No stock in this warehouse yet"}
              </p>
              {!search && (
                <p className="text-gray-400 text-xs mt-1">
                  Use &quot;Stock in / out&quot; to add stock
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Category
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ product, qty }) => {
                    const status = getStockStatus(
                      qty,
                      product.low_stock_threshold,
                    );
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400 md:hidden">
                            {product.category}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 hidden md:table-cell">
                          {product.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-gray-900">
                          {qty.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setModalProductId(product.id);
                              setShowAdjustModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                            title="Stock in / out"
                          >
                            <ArrowDownToLine size={16} />
                          </button>
                          {warehouses.length > 1 && (
                            <button
                              onClick={() => {
                                setModalProductId(product.id);
                                setShowTransferModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Transfer"
                            >
                              <ArrowRightLeft size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAdjustModal && (
          <AdjustStockModal
            warehouse={selectedWarehouse}
            products={products}
            staff={staff}
            currentQty={stockMap[selectedWarehouse.id] || {}}
            defaultProductId={modalProductId}
            onClose={closeModals}
            onSuccess={onModalSuccess}
          />
        )}
        {showTransferModal && (
          <TransferModal
            warehouses={warehouses}
            products={products}
            staff={staff}
            stock={stockMap}
            defaultFromId={selectedWarehouse.id}
            defaultProductId={modalProductId}
            onClose={closeModals}
            onSuccess={onModalSuccess}
          />
        )}
      </div>
    );
  }

  // ============================================
  // Main view with tabs
  // ============================================
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track stock across your locations
          </p>
        </div>
        {tab === "warehouses" && isAdmin && (
          <button
            onClick={() => setShowWarehouseModal(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
          >
            <Plus size={18} /> Add warehouse
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(
          [
            { id: "warehouses", label: "Warehouses", icon: <WarehouseIcon size={15} /> },
            { id: "movements", label: "Movements", icon: <History size={15} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSearch("");
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-[var(--color-primary)] text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ---- WAREHOUSES TAB ---- */}
      {tab === "warehouses" && (
        <>
          {warehouses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 px-4">
              <WarehouseIcon size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                No warehouses yet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Click &quot;Add warehouse&quot; to create your first location
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {warehouses.map((w) => {
                const wStock = stockMap[w.id] || {};
                const productCount = Object.keys(wStock).filter(
                  (pid) => wStock[pid] > 0,
                ).length;
                const units = Object.values(wStock).reduce((s, q) => s + q, 0);
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWarehouse(w)}
                    className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[var(--color-primary)] hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
                        <WarehouseIcon
                          size={20}
                          className="text-[var(--color-primary)]"
                        />
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWarehouse(w);
                          }}
                          className="p-2 text-gray-300 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                    </div>
                    <p className="text-base font-semibold text-gray-900">
                      {w.name}
                    </p>
                    {w.location && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} /> {w.location}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                      <div>
                        <p className="text-xs text-gray-400">Products</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {productCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Units</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {units.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---- MOVEMENTS TAB ---- */}
      {tab === "movements" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <History size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                No movements yet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Stock in, stock out, and transfers will show here
              </p>
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
      )}

      {/* ---- Modals ---- */}
      {(showWarehouseModal || editingWarehouse) && (
        <WarehouseModal
          warehouse={editingWarehouse}
          onClose={closeModals}
          onSuccess={onModalSuccess}
        />
      )}
    </div>
  );
}
