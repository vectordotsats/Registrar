"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatQtyPieces, getStockStatus } from "@/lib/utils";
import type { Product } from "@/types";
import { Plus, Search, Package, Edit2, Loader2, MapPin } from "lucide-react";
import ProductModal from "../warehouses/ProductModal";
import ProductLocationsModal, {
  type ProductLocation,
} from "./ProductLocationsModal";

export default function ProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [stockRows, setStockRows] = useState<
    { warehouse_id: string; product_id: string; quantity: number }[]
  >([]);
  const [warehouses, setWarehouses] = useState<
    { id: string; name: string; location: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    const [productsRes, stockRes, warehousesRes] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase
        .from("warehouse_stock")
        .select("warehouse_id, product_id, quantity"),
      supabase.from("warehouses").select("id, name, location").order("name"),
    ]);
    setProducts(productsRes.data || []);
    setStockRows(stockRes.data || []);
    setWarehouses(warehousesRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Total stock per product across all warehouses
  const totalByProduct: Record<string, number> = {};
  stockRows.forEach((row) => {
    totalByProduct[row.product_id] =
      (totalByProduct[row.product_id] || 0) + row.quantity;
  });

  // Which warehouse holds how much of each product
  const warehouseById: Record<
    string,
    { id: string; name: string; location: string }
  > = {};
  warehouses.forEach((w) => (warehouseById[w.id] = w));
  const locationsByProduct: Record<string, ProductLocation[]> = {};
  stockRows.forEach((row) => {
    const w = warehouseById[row.warehouse_id];
    if (!w) return;
    if (!locationsByProduct[row.product_id])
      locationsByProduct[row.product_id] = [];
    locationsByProduct[row.product_id].push({
      id: w.id,
      name: w.name,
      location: w.location,
      quantity: row.quantity,
    });
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  const closeModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };
  const onSuccess = () => {
    closeModal();
    fetchData();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">
            Everything you stock, and how much of it you hold in total
          </p>
        </div>
        <button
          onClick={() => setShowProductModal(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
        >
          <Plus size={18} /> Add product
        </button>
      </div>

      {/* Summary */}
      <div className="inline-flex items-baseline gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-6">
        <span className="text-xl font-bold text-gray-900">
          {products.length}
        </span>
        <span className="text-xs text-gray-500">
          {products.length === 1 ? "product" : "products"}
        </span>
      </div>

      {/* Search — only once there's more than one product */}
      {products.length > 1 && (
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
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filteredProducts.length === 0 ? (
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
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Total stock
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
                {filteredProducts.map((product) => {
                  const total = totalByProduct[product.id] || 0;
                  const status = getStockStatus(
                    total,
                    product.low_stock_threshold,
                  );
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setViewingProduct(product)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400 md:hidden">
                          {product.category}
                        </p>
                        <span
                          className={`sm:hidden inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 hidden md:table-cell">
                        {product.category}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-900 whitespace-nowrap">
                        {formatQtyPieces(total, product.unit, product.pack_size)}
                      </td>
                      <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingProduct(product);
                          }}
                          className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors cursor-pointer"
                          title="Where is it?"
                        >
                          <MapPin size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(product);
                          }}
                          className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors cursor-pointer"
                          title="Edit product"
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

      {(showProductModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {viewingProduct && (
        <ProductLocationsModal
          product={viewingProduct}
          locations={locationsByProduct[viewingProduct.id] || []}
          onClose={() => setViewingProduct(null)}
        />
      )}
    </div>
  );
}
