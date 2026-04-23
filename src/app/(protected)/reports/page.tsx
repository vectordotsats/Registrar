"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, formatDate } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface SaleRecord {
  id: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  payment_type: string;
  status: string;
  sold_by: string;
  is_deleted: boolean;
}

interface SaleItemRecord {
  quantity: number;
  subtotal: number;
  products: { name: string } | null;
}

interface CustomerDebt {
  name: string;
  total_debt: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">(
    "today",
  );

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItemRecord[]>([]);
  const [debtors, setDebtors] = useState<CustomerDebt[]>([]);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [salesRes, itemsRes, debtorsRes, productsRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .eq("is_deleted", false)
          .order("sale_date", { ascending: false }),
        supabase
          .from("sale_items")
          .select("quantity, subtotal, products (name)"),
        supabase
          .from("customers")
          .select("name, total_debt")
          .gt("total_debt", 0)
          .order("total_debt", { ascending: false }),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);
      setSales((salesRes.data as SaleRecord[]) || []);
      setSaleItems((itemsRes.data as SaleItemRecord[]) || []);
      setDebtors((debtorsRes.data as CustomerDebt[]) || []);
      setProductCount(productsRes.count || 0);
      setLoading(false);
    };
    load();
  }, [supabase]);

  // Filter sales by period
  const now = new Date();
  const getStartDate = () => {
    if (period === "today") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === "month") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    return new Date(0);
  };

  const startDate = getStartDate();
  const filteredSales = sales.filter((s) => new Date(s.sale_date) >= startDate);

  // Revenue stats
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.amount_paid, 0);
  const totalSalesAmount = filteredSales.reduce(
    (sum, s) => sum + s.total_amount,
    0,
  );
  const cashSales = filteredSales.filter((s) => s.payment_type === "cash");
  const invoiceSales = filteredSales.filter((s) => s.payment_type === "credit");
  const cashRevenue = cashSales.reduce((sum, s) => sum + s.amount_paid, 0);
  const invoiceRevenue = invoiceSales.reduce(
    (sum, s) => sum + s.amount_paid,
    0,
  );
  const totalOutstanding = filteredSales.reduce(
    (sum, s) => sum + (s.total_amount - s.amount_paid),
    0,
  );
  const totalDebt = debtors.reduce((sum, d) => sum + d.total_debt, 0);

  // Profit (rough — based on all sales amount vs paid)
  const avgTransactionValue =
    filteredSales.length > 0 ? totalSalesAmount / filteredSales.length : 0;

  // Sales by staff
  const staffSales: Record<string, { count: number; revenue: number }> = {};
  filteredSales.forEach((s) => {
    if (!staffSales[s.sold_by])
      staffSales[s.sold_by] = { count: 0, revenue: 0 };
    staffSales[s.sold_by].count++;
    staffSales[s.sold_by].revenue += s.total_amount;
  });
  const staffRanking = Object.entries(staffSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top selling products
  const productSales: Record<
    string,
    { name: string; qty: number; revenue: number }
  > = {};
  saleItems.forEach((item) => {
    const name = item.products?.name || "Unknown";
    if (!productSales[name]) productSales[name] = { name, qty: 0, revenue: 0 };
    productSales[name].qty += item.quantity;
    productSales[name].revenue += item.subtotal;
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            Business performance overview
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          {(["today", "week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                period === p
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p === "today"
                ? "Today"
                : p === "week"
                  ? "7 days"
                  : p === "month"
                    ? "30 days"
                    : "All time"}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green-500" />
            <p className="text-xs text-gray-500">Revenue collected</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatNaira(totalRevenue)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total sales value</p>
          <p className="text-xl font-bold text-gray-900">
            {formatNaira(totalSalesAmount)}
          </p>
          <p className="text-xs text-gray-400">
            {filteredSales.length} transactions
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-500" />
            <p className="text-xs text-gray-500">Outstanding (period)</p>
          </div>
          <p className="text-xl font-bold text-red-600">
            {formatNaira(totalOutstanding)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. transaction</p>
          <p className="text-xl font-bold text-gray-900">
            {formatNaira(avgTransactionValue)}
          </p>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cash sales</p>
          <p className="text-lg font-bold text-gray-900">
            {formatNaira(cashRevenue)}
          </p>
          <p className="text-xs text-gray-400">
            {cashSales.length} transactions
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Invoice sales</p>
          <p className="text-lg font-bold text-gray-900">
            {formatNaira(invoiceRevenue)}
          </p>
          <p className="text-xs text-gray-400">
            {invoiceSales.length} transactions
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">
            Total debt (all customers)
          </p>
          <p className="text-lg font-bold text-red-600">
            {formatNaira(totalDebt)}
          </p>
          <p className="text-xs text-gray-400">
            {debtors.length} customers owing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top products */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Top selling products
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No sales data yet
              </p>
            ) : (
              <div>
                {topProducts.map((product, i) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {product.qty} units sold
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNaira(product.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sales by staff */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Sales by staff
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {staffRanking.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No sales data yet
              </p>
            ) : (
              <div>
                {staffRanking.map((staff, i) => (
                  <div
                    key={staff.name}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center text-xs font-medium text-[var(--color-primary)]">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {staff.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {staff.count} sales
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatNaira(staff.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top debtors */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Top debtors
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {debtors.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No outstanding debt
              </p>
            ) : (
              <div>
                {debtors.slice(0, 10).map((debtor) => (
                  <div
                    key={debtor.name}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {debtor.name}
                    </p>
                    <p className="text-sm font-semibold text-red-600">
                      {formatNaira(debtor.total_debt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
