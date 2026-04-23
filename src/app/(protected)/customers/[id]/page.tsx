"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, formatDateTime, getStatusColor } from "@/lib/utils";
import type { Customer } from "@/types";
import {
  ArrowLeft,
  Loader2,
  Phone,
  MapPin,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";

interface SaleRecord {
  id: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  invoice_number: string | null;
  sold_by: string;
  sale_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: { name: string } | null;
  }[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  payment_date: string;
  recorded_by: string;
  notes: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchData = async () => {
    const [customerRes, salesRes, paymentsRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).single(),
      supabase
        .from("sales")
        .select(
          `*, sale_items (id, quantity, unit_price, subtotal, products (name))`,
        )
        .eq("customer_id", customerId)
        .eq("is_deleted", false)
        .order("sale_date", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customerId)
        .order("payment_date", { ascending: false }),
    ]);

    setCustomer(customerRes.data);
    setSales((salesRes.data as SaleRecord[]) || []);
    setPayments((paymentsRes.data as PaymentRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  const totalPurchases = sales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push("/customers")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 cursor-pointer"
      >
        <ArrowLeft size={18} />
        Back to customers
      </button>

      {/* Customer header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xl font-medium">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {customer.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {customer.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={12} /> {customer.phone}
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} /> {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {customer.total_debt > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
            >
              Record payment
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Total purchases</p>
            <p className="text-lg font-bold text-gray-900">
              {formatNaira(totalPurchases)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Total paid</p>
            <p className="text-lg font-bold text-green-600">
              {formatNaira(totalPurchases - customer.total_debt)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">Outstanding debt</p>
            <p
              className={`text-lg font-bold ${customer.total_debt > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {customer.total_debt > 0
                ? formatNaira(customer.total_debt)
                : "Clear"}
            </p>
          </div>
        </div>
      </div>

      {/* Two columns: Invoices + Payments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Invoices */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Invoices ({sales.length})
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {sales.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <FileText size={32} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No invoices yet</p>
              </div>
            ) : (
              <div>
                {sales.map((sale) => {
                  const statusColor = getStatusColor(sale.status);
                  return (
                    <div
                      key={sale.id}
                      className="px-4 py-3.5 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {sale.invoice_number
                              ? `Invoice #${sale.invoice_number}`
                              : "Sale"}
                          </p>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${statusColor}`}
                          >
                            {sale.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNaira(sale.total_amount)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(sale.sale_date)} — by {sale.sold_by}
                      </p>
                      {sale.total_amount - sale.amount_paid > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          {formatNaira(sale.total_amount - sale.amount_paid)}{" "}
                          outstanding
                        </p>
                      )}
                      {/* Items */}
                      <div className="mt-2 space-y-0.5">
                        {sale.sale_items.map((item) => (
                          <p key={item.id} className="text-xs text-gray-500">
                            {item.products?.name} x{item.quantity} —{" "}
                            {formatNaira(item.subtotal)}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Payments ({payments.length})
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <CheckCircle2 size={32} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No payments recorded</p>
              </div>
            ) : (
              <div>
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="px-4 py-3.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-green-600">
                        +{formatNaira(payment.amount)}
                      </p>
                      <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded-md">
                        {payment.method}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(payment.payment_date)} — recorded by{" "}
                      {payment.recorded_by}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-gray-500 mt-1">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          customer={customer}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ---- Record Payment Modal ----
function RecordPaymentModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffMembers, setStaffMembers] = useState<
    { id: string; name: string }[]
  >([]);

  const [form, setForm] = useState({
    amount: "",
    method: "cash",
    recorded_by: "",
    notes: "",
  });

  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase
        .from("staff_members")
        .select("*")
        .eq("is_active", true)
        .order("name");
      setStaffMembers(data || []);
    };
    loadStaff();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid payment amount");
      return;
    }
    if (!form.recorded_by) {
      setError("Select who recorded this payment");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Record the payment
    const { error: payError } = await supabase.from("payments").insert({
      customer_id: customer.id,
      created_by: user.id,
      recorded_by: form.recorded_by,
      amount,
      method: form.method,
      notes: form.notes.trim(),
    });

    if (payError) {
      setError(payError.message);
      setLoading(false);
      return;
    }

    // Update customer debt
    const newDebt = Math.max(0, customer.total_debt - amount);
    await supabase
      .from("customers")
      .update({ total_debt: newDebt })
      .eq("id", customer.id);

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Record payment
            </h2>
            <p className="text-xs text-gray-500">
              {customer.name} — owes {formatNaira(customer.total_debt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (&#8358;) *
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0"
              min="0"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            {form.amount && parseFloat(form.amount) > 0 && (
              <div className="mt-2 bg-green-50 rounded-xl px-4 py-2">
                <p className="text-xs text-green-700">
                  New balance after payment:{" "}
                  {formatNaira(
                    Math.max(0, customer.total_debt - parseFloat(form.amount)),
                  )}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["cash", "transfer", "pos"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, method }))}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer capitalize ${
                    form.method === method
                      ? "bg-[var(--color-primary)] text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {method === "pos" ? "POS" : method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recorded by *
            </label>
            <select
              value={form.recorded_by}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, recorded_by: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            >
              <option value="">Select staff member</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="e.g. Part payment for Invoice #0045"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Recording...
                </>
              ) : (
                "Record payment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
