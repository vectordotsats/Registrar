"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatNaira } from "@/lib/utils";
import type { Product, Customer } from "@/types";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const STOCK_UNITS = [
  { label: "Piece", value: 1 },
  { label: "Pack of 6", value: 6 },
  { label: "Dozen (12)", value: 12 },
  { label: "Pack of 20", value: 20 },
  { label: "Carton of 24", value: 24 },
  { label: "Pack of 30", value: 30 },
  { label: "Carton of 36", value: 36 },
  { label: "Carton of 48", value: 48 },
  { label: "Carton of 50", value: 50 },
  { label: "Carton of 100", value: 100 },
  { label: "Bag", value: 1 },
];

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  stockUnit: (typeof STOCK_UNITS)[0];
  unitQuantity: number;
}

interface StaffMember {
  id: string;
  name: string;
}

export default function NewSalePage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const [saleType, setSaleType] = useState<"cash" | "invoice">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [soldBy, setSoldBy] = useState("");

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );
  const paidAmount =
    saleType === "cash" ? cartTotal : parseFloat(amountPaid) || 0;
  const balanceOwed = cartTotal - paidAmount;

  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState("");

  useEffect(() => {
    const load = async () => {
      const [productsRes, customersRes, staffRes] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("customers").select("*").order("name"),
        supabase
          .from("staff_members")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);
      setProducts(productsRes.data || []);
      setCustomers(customersRes.data || []);
      setStaffMembers(staffRes.data || []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const filteredProducts = products.filter(
    (p) =>
      p.quantity_in_stock > 0 &&
      !cart.find((c) => c.product.id === p.id) &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase())),
  );

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  const addToCart = (product: Product) => {
    setCart((prev) => [
      ...prev,
      {
        product,
        quantity: 1,
        unit_price: product.selling_price,
        stockUnit: STOCK_UNITS[0],
        unitQuantity: 1,
      },
    ]);
    setProductSearch("");
  };

  const updateCartItemUnit = (productId: string, unitLabel: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const unit =
            STOCK_UNITS.find((u) => u.label === unitLabel) || STOCK_UNITS[0];
          const maxUnitQty = Math.floor(
            item.product.quantity_in_stock / unit.value,
          );
          const clampedUnitQty = Math.max(
            1,
            Math.min(item.unitQuantity, maxUnitQty),
          );
          return {
            ...item,
            stockUnit: unit,
            unitQuantity: clampedUnitQty,
            quantity: clampedUnitQty * unit.value,
          };
        }
        return item;
      }),
    );
  };

  const updateCartItemQuantity = (productId: string, newUnitQty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxUnitQty = Math.floor(
            item.product.quantity_in_stock / item.stockUnit.value,
          );
          const clamped = Math.max(1, Math.min(newUnitQty, maxUnitQty));
          return {
            ...item,
            unitQuantity: clamped,
            quantity: clamped * item.stockUnit.value,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError("Add at least one product to the cart");
      return;
    }
    if (!soldBy) {
      setError("Select who made this sale");
      return;
    }
    if (saleType === "invoice" && !selectedCustomerId) {
      setError("Select a customer for invoice sales");
      return;
    }
    if (saleType === "invoice" && !invoiceNumber.trim()) {
      setError("Enter the invoice number from the invoice book");
      return;
    }

    setSubmitting(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let status = "paid";
    if (saleType === "invoice") {
      if (paidAmount <= 0) status = "unpaid";
      else if (paidAmount < cartTotal) status = "partial";
      else status = "paid";
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        customer_id: saleType === "invoice" ? selectedCustomerId : null,
        created_by: user.id,
        sold_by: soldBy,
        total_amount: cartTotal,
        amount_paid: paidAmount,
        payment_type: saleType === "cash" ? "cash" : "credit",
        status,
        invoice_number: saleType === "invoice" ? invoiceNumber.trim() : null,
      })
      .select()
      .single();

    if (saleError || !sale) {
      setError(saleError?.message || "Failed to create sale");
      setSubmitting(false);
      return;
    }

    const saleItems = cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);
    if (itemsError) {
      setError(itemsError.message);
      setSubmitting(false);
      return;
    }

    for (const item of cart) {
      const newStock = item.product.quantity_in_stock - item.quantity;
      await supabase
        .from("products")
        .update({ quantity_in_stock: newStock })
        .eq("id", item.product.id);

      await supabase.from("inventory_log").insert({
        product_id: item.product.id,
        created_by: user.id,
        logged_by: soldBy,
        type: "sale",
        quantity_change: -item.quantity,
        stock_after: newStock,
        reason:
          saleType === "invoice"
            ? `Invoice ${invoiceNumber.trim()} — sold ${item.quantity} units`
            : `Cash sale — sold ${item.quantity} units`,
      });
    }

    if (saleType === "invoice" && balanceOwed > 0) {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      if (customer) {
        await supabase
          .from("customers")
          .update({ total_debt: customer.total_debt + balanceOwed })
          .eq("id", selectedCustomerId);
      }
    }

    setSavedInvoiceNumber(invoiceNumber.trim());
    setSuccess(true);
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sale recorded!</h2>
        <p className="text-gray-500 text-sm mb-1">
          {formatNaira(cartTotal)} —{" "}
          {saleType === "cash"
            ? "Cash sale"
            : `Invoice sale (${formatNaira(paidAmount)} paid)`}
        </p>
        {savedInvoiceNumber && (
          <p className="text-[var(--color-primary)] text-sm font-medium mb-6">
            Invoice #{savedInvoiceNumber}
          </p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setCart([]);
              setSaleType("cash");
              setSelectedCustomerId("");
              setAmountPaid("");
              setInvoiceNumber("");
              setSoldBy("");
              setSuccess(false);
              setProductSearch("");
              setCustomerSearch("");
              setSavedInvoiceNumber("");
            }}
            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            New sale
          </button>
          <button
            onClick={() => router.push("/sales")}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            View sales
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New sale</h1>
        <p className="text-gray-500 text-sm mt-1">Record a new transaction</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Product picker + Cart */}
        <div className="xl:col-span-2 space-y-4">
          {/* Search products */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add products
            </label>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            {productSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                {filteredProducts.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">
                    No products found
                  </p>
                ) : (
                  filteredProducts.slice(0, 8).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {product.category} — {product.quantity_in_stock} in
                          stock
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatNaira(product.selling_price)}
                        </p>
                        <Plus
                          size={16}
                          className="text-[var(--color-primary)] ml-auto mt-0.5"
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
            </h3>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <ShoppingCart size={32} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Search and add products above
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-gray-50 rounded-xl"
                  >
                    {/* Top row: name + price + delete */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatNaira(item.unit_price)} each —{" "}
                          {item.product.quantity_in_stock} in stock
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNaira(item.unit_price * item.quantity)}
                        </p>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom row: unit picker + quantity */}
                    <div className="flex items-center gap-2">
                      <select
                        value={item.stockUnit.label}
                        onChange={(e) =>
                          updateCartItemUnit(item.product.id, e.target.value)
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
                      >
                        {STOCK_UNITS.map((unit) => (
                          <option key={unit.label} value={unit.label}>
                            {unit.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.product.id,
                              item.unitQuantity - 1,
                            )
                          }
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          value={item.unitQuantity}
                          onChange={(e) =>
                            updateCartItemQuantity(
                              item.product.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          min="1"
                          className="w-14 text-center py-1.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.product.id,
                              item.unitQuantity + 1,
                            )
                          }
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Unit calculation display */}
                    {item.stockUnit.value > 1 && (
                      <p className="text-xs text-[var(--color-primary)] font-medium mt-2">
                        {item.unitQuantity} x {item.stockUnit.label} ={" "}
                        {item.quantity} units
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNaira(cartTotal)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment details */}
        <div className="space-y-4">
          {/* Sold by — dropdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who made this sale? *
            </label>
            <select
              value={soldBy}
              onChange={(e) => setSoldBy(e.target.value)}
              className="w-full px-2 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            >
              <option value="">Select staff member</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
            {staffMembers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                No staff members added yet. Go to Settings to add them.
              </p>
            )}
          </div>

          {/* Sale type */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sale type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaleType("cash");
                  setSelectedCustomerId("");
                  setInvoiceNumber("");
                }}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  saleType === "cash"
                    ? "bg-[var(--color-primary)] text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cash sale
              </button>
              <button
                type="button"
                onClick={() => setSaleType("invoice")}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  saleType === "invoice"
                    ? "bg-[var(--color-primary)] text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Invoice sale
              </button>
            </div>
          </div>

          {/* Invoice details */}
          {saleType === "invoice" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. 0045"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter the number from your invoice book
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomerId("");
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent mb-2"
                />
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setCustomerSearch(customer.name);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        selectedCustomerId === customer.id
                          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <p>{customer.name}</p>
                      {customer.total_debt > 0 && (
                        <p className="text-xs text-red-500">
                          Owes {formatNaira(customer.total_debt)}
                        </p>
                      )}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">
                      No customers found
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount paying now (&#8358;)
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter 0 if paying later
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          {cart.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatNaira(cartTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="font-medium text-green-600">
                  {formatNaira(paidAmount)}
                </span>
              </div>
              {saleType === "invoice" && balanceOwed > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Balance owed</span>
                  <span className="font-medium text-red-600">
                    {formatNaira(balanceOwed)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || cart.length === 0}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3.5 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Recording sale...
              </>
            ) : (
              `Record sale — ${formatNaira(cartTotal)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
