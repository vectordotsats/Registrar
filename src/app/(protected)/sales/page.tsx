"use client";

import { useState } from "react";
import { ShoppingCart, ClipboardList, Wallet } from "lucide-react";
import NewSaleTab from "./NewSaleTab";
import HistoryTab from "./HistoryTab";
import ExpensesTab from "./ExpensesTab";

type Tab = "new" | "history" | "expenses";

const tabs = [
  { id: "new" as Tab, label: "New sale", icon: <ShoppingCart size={18} /> },
  { id: "history" as Tab, label: "History", icon: <ClipboardList size={18} /> },
  { id: "expenses" as Tab, label: "Expenses", icon: <Wallet size={18} /> },
];

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("new");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-gray-500 text-sm mt-1">
          Record sales, view history, and track expenses
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "new" && <NewSaleTab />}
      {activeTab === "history" && <HistoryTab />}
      {activeTab === "expenses" && <ExpensesTab />}
    </div>
  );
}
