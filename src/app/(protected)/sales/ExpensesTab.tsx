"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, getBusinessId } from "@/lib/utils";
import { Plus, Loader2, Wallet, Trash2, X } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
}

export default function ExpensesTab() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const deleteExpense = async (id: string, desc: string) => {
    if (!window.confirm(`Delete "${desc}"?`)) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const today = new Date().toDateString();
  const todayExpenses = expenses.filter(
    (e) => new Date(e.expense_date).toDateString() === today,
  );
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTotal = expenses
    .filter((e) => new Date(e.expense_date) >= weekAgo)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthTotal = expenses
    .filter((e) => new Date(e.expense_date) >= monthAgo)
    .reduce((sum, e) => sum + e.amount, 0);

  const groupedByDate: Record<string, Expense[]> = {};
  expenses.forEach((e) => {
    const key = new Date(e.expense_date).toDateString();
    if (!groupedByDate[key]) groupedByDate[key] = [];
    groupedByDate[key].push(e);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div />
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
        >
          <Plus size={18} /> Add expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Today</p>
          <p className="text-xl font-bold text-red-600">
            {formatNaira(todayTotal)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">This week</p>
          <p className="text-xl font-bold text-gray-900">
            {formatNaira(weekTotal)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">This month</p>
          <p className="text-xl font-bold text-gray-900">
            {formatNaira(monthTotal)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20">
            <Wallet size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              No expenses recorded
            </p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([dateStr, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
            const isToday = dateStr === today;
            const displayDate = isToday
              ? "Today"
              : new Date(dateStr).toLocaleDateString("en-NG", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
            return (
              <div key={dateStr}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-sm font-semibold text-gray-700">
                    {displayDate}
                  </p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatNaira(dayTotal)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {items.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                          <Wallet size={16} className="text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {expense.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(expense.expense_date).toLocaleTimeString(
                              "en-NG",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-red-600">
                          -{formatNaira(expense.amount)}
                        </p>
                        <button
                          onClick={() =>
                            deleteExpense(expense.id, expense.description)
                          }
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            fetchExpenses();
          }}
        />
      )}
    </div>
  );
}

function AddExpenseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Enter what was spent on");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");

    const businessId = await getBusinessId(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: dbError } = await supabase.from("expenses").insert({
      business_id: businessId,
      description: description.trim(),
      amount: parseFloat(amount),
      created_by: user?.id,
    });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add expense</h2>
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
              What was it for? *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch for staff, Fuel, Water"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (&#8358;) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              required
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
                  Adding...
                </>
              ) : (
                "Add expense"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
