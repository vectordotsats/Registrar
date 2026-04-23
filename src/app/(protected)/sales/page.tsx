"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, formatDateTime, getStatusColor } from "@/lib/utils";
import {
  Search,
  Loader2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

interface SaleWithDetails {
  id: string;
  customer_id: string | null;
  sold_by: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  payment_type: string;
  status: string;
  invoice_number: string | null;
  is_deleted: boolean;
  customers: { name: string } | null;
  sale_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: { name: string } | null;
  }[];
}

export default function SalesPage() {
  const supabase = createClient();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "cash" | "invoice">("all");
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      const { data } = await supabase
        .from("sales")
        .select(
          `
          *,
          customers (name),
          sale_items (
            id,
            quantity,
            unit_price,
            subtotal,
            products (name)
          )
        `,
        )
        .eq("is_deleted", false)
        .order("sale_date", { ascending: false });

      setSales((data as SaleWithDetails[]) || []);
      setLoading(false);
    };
    fetchSales();
  }, [supabase]);

  const filtered = sales.filter((sale) => {
    const matchesSearch =
      !search ||
      sale.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      sale.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      sale.sold_by.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "cash" && sale.payment_type === "cash") ||
      (filter === "invoice" && sale.payment_type === "credit");

    return matchesSearch && matchesFilter;
  });

  // Summary stats
  const todaySales = sales.filter((s) => {
    const today = new Date().toDateString();
    return new Date(s.sale_date).toDateString() === today;
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.amount_paid, 0);
  const totalOutstanding = sales
    .filter((s) => s.status !== "paid")
    .reduce((sum, s) => sum + (s.total_amount - s.amount_paid), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-gray-500 text-sm mt-1">
          View and track all transactions
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total sales</p>
          <p className="text-xl font-bold text-gray-900">{sales.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Today&apos;s sales</p>
          <p className="text-xl font-bold text-gray-900">{todaySales.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Today&apos;s revenue</p>
          <p className="text-xl font-bold text-green-600">
            {formatNaira(todayRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Outstanding debt</p>
          <p className="text-xl font-bold text-red-600">
            {formatNaira(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by invoice #, customer, or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "cash", "invoice"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                filter === type
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {type === "all" ? "All" : type === "cash" ? "Cash" : "Invoice"}
            </button>
          ))}
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <ClipboardList size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {search || filter !== "all"
                ? "No sales match your search"
                : "No sales recorded yet"}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((sale) => {
              const isExpanded = expandedSale === sale.id;
              const statusColor = getStatusColor(sale.status);
              const isInvoice = sale.payment_type === "credit";

              return (
                <div
                  key={sale.id}
                  className="border-b border-gray-50 last:border-0"
                >
                  {/* Sale row */}
                  <button
                    onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50/50 transition-colors text-left cursor-pointer"
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isInvoice
                          ? "bg-[var(--color-primary-light)]"
                          : "bg-gray-100"
                      }`}
                    >
                      {isInvoice ? (
                        <FileText
                          size={18}
                          className="text-[var(--color-primary)]"
                        />
                      ) : (
                        <ClipboardList size={18} className="text-gray-500" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isInvoice
                            ? `Invoice #${sale.invoice_number || "—"}`
                            : "Cash sale"}
                        </p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${statusColor}`}
                        >
                          {sale.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sale.customers?.name || "Walk-in"} — by {sale.sold_by}{" "}
                        — {formatDateTime(sale.sale_date)}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatNaira(sale.total_amount)}
                      </p>
                      {isInvoice && sale.amount_paid < sale.total_amount && (
                        <p className="text-xs text-red-500">
                          {formatNaira(sale.total_amount - sale.amount_paid)}{" "}
                          owed
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="flex-shrink-0 text-gray-400">
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        {/* Items table */}
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Items sold
                        </p>
                        <div className="space-y-2">
                          {sale.sale_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div>
                                <span className="text-gray-900">
                                  {item.products?.name || "Unknown product"}
                                </span>
                                <span className="text-gray-400 ml-2">
                                  x{item.quantity}
                                </span>
                              </div>
                              <span className="text-gray-900 font-medium">
                                {formatNaira(item.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Payment summary */}
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total</span>
                            <span className="font-semibold text-gray-900">
                              {formatNaira(sale.total_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Paid</span>
                            <span className="text-green-600 font-medium">
                              {formatNaira(sale.amount_paid)}
                            </span>
                          </div>
                          {sale.total_amount - sale.amount_paid > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Outstanding</span>
                              <span className="text-red-600 font-medium">
                                {formatNaira(
                                  sale.total_amount - sale.amount_paid,
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Sale info */}
                        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Sold by</span>
                            <p className="text-gray-700 font-medium">
                              {sale.sold_by}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Customer</span>
                            <p className="text-gray-700 font-medium">
                              {sale.customers?.name || "Walk-in"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Type</span>
                            <p className="text-gray-700 font-medium capitalize">
                              {sale.payment_type}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400">Date</span>
                            <p className="text-gray-700 font-medium">
                              {formatDateTime(sale.sale_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
