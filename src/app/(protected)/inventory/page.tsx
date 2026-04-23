"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira, getStockStatus } from "@/lib/utils";
import type { Product } from "@/types";
import { Plus, Search, Package, Edit2, Loader2 } from "lucide-react";
import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";

export default function InventoryPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Get unique categories for the summary
  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => p.quantity_in_stock <= p.low_stock_threshold,
  ).length;
  const outOfStockCount = products.filter(
    (p) => p.quantity_in_stock <= 0,
  ).length;
  const totalStockValue = products.reduce(
    (sum, p) => sum + p.selling_price * p.quantity_in_stock,
    0,
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your products and stock levels
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          Add product
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total products</p>
          <p className="text-xl font-bold text-gray-900">{totalProducts}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Stock value</p>
          <p className="text-xl font-bold text-gray-900">
            {formatNaira(totalStockValue)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Low stock</p>
          <p className="text-xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Out of stock</p>
          <p className="text-xl font-bold text-red-600">{outOfStockCount}</p>
        </div>
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
            placeholder="Search products or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Package size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {search ? "No products match your search" : "No products yet"}
            </p>
            {!search && (
              <p className="text-gray-400 text-xs mt-1">
                Click &quot;Add product&quot; to get started
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
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    Cost price
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Selling price
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Stock
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
                {filtered.map((product) => {
                  const status = getStockStatus(
                    product.quantity_in_stock,
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
                      <td className="py-3.5 px-4 text-right text-gray-600 hidden lg:table-cell">
                        {formatNaira(product.cost_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-900">
                        {formatNaira(product.selling_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-900">
                        {product.quantity_in_stock}
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
                          onClick={() => setEditingProduct(product)}
                          className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
