import { createClient } from "@/lib/supabase-server";
import { formatNaira } from "@/lib/utils";
import { Package, TrendingUp, Users, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user?.id)
    .single();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all data in parallel
  const [salesRes, productsRes, customersRes, recentSalesRes] =
    await Promise.all([
      supabase
        .from("sales")
        .select("total_amount, amount_paid, sale_date, status")
        .eq("is_deleted", false)
        .gte("sale_date", today.toISOString()),
      supabase
        .from("products")
        .select("name, quantity_in_stock, low_stock_threshold, selling_price"),
      supabase
        .from("customers")
        .select("name, total_debt")
        .gt("total_debt", 0)
        .order("total_debt", { ascending: false })
        .limit(5),
      supabase
        .from("sales")
        .select(
          "id, total_amount, amount_paid, payment_type, status, sale_date, sold_by, invoice_number, customers(name)",
        )
        .eq("is_deleted", false)
        .order("sale_date", { ascending: false })
        .limit(5),
    ]);

  const todaySales = salesRes.data || [];
  const products = productsRes.data || [];
  const topDebtors = customersRes.data || [];
  const recentSales = recentSalesRes.data || [];

  const todayRevenue = todaySales.reduce(
    (sum: number, s: { amount_paid: number }) => sum + s.amount_paid,
    0,
  );
  const todaySalesCount = todaySales.length;
  const totalOutstandingDebt = topDebtors.reduce(
    (sum: number, c: { total_debt: number }) => sum + c.total_debt,
    0,
  );

  const lowStockProducts = products.filter(
    (p: { quantity_in_stock: number; low_stock_threshold: number }) =>
      p.quantity_in_stock <= p.low_stock_threshold && p.quantity_in_stock > 0,
  );
  const outOfStockProducts = products.filter(
    (p: { quantity_in_stock: number }) => p.quantity_in_stock <= 0,
  );

  const isAdmin = profile?.role === "admin";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.name || "there"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here&apos;s your business overview for today
        </p>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Today&apos;s revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNaira(todayRevenue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{todaySalesCount} sales</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <Users size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Outstanding debt</p>
          <p className="text-2xl font-bold text-red-600">
            {formatNaira(totalOutstandingDebt)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {topDebtors.length} customers
          </p>
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

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
              <Package size={16} className="text-[var(--color-primary)]" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Total products</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          {isAdmin && (
            <p className="text-xs text-gray-400 mt-1">
              Stock value:{" "}
              {formatNaira(
                products.reduce(
                  (
                    sum: number,
                    p: { selling_price: number; quantity_in_stock: number },
                  ) => sum + p.selling_price * p.quantity_in_stock,
                  0,
                ),
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent sales */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recent sales
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {recentSales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No sales recorded yet
              </p>
            ) : (
              <div>
                {recentSales.map((sale: Record<string, unknown>) => (
                  <div
                    key={sale.id as string}
                    className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {sale.invoice_number
                          ? `Invoice #${sale.invoice_number}`
                          : "Cash sale"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(sale.customers as Record<string, string> | null)
                          ?.name || "Walk-in"}{" "}
                        — {sale.sold_by as string}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatNaira(sale.total_amount as number)}
                      </p>
                      <span
                        className={`text-xs font-medium ${
                          sale.status === "paid"
                            ? "text-green-600"
                            : sale.status === "partial"
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {sale.status as string}
                      </span>
                    </div>
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
            {topDebtors.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                No outstanding debt
              </p>
            ) : (
              <div>
                {topDebtors.map(
                  (debtor: { name: string; total_debt: number }) => (
                    <div
                      key={debtor.name}
                      className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-medium">
                          {debtor.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {debtor.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-red-600">
                        {formatNaira(debtor.total_debt)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStockProducts.length > 0 && (
          <div className="xl:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Low stock alerts
            </h2>
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0">
                {lowStockProducts.map(
                  (p: {
                    name: string;
                    quantity_in_stock: number;
                    low_stock_threshold: number;
                  }) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between px-4 py-3 border-b border-gray-50 sm:border-r last:border-0"
                    >
                      <p className="text-sm text-gray-900">{p.name}</p>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        {p.quantity_in_stock} left
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
