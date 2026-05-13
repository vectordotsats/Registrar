import { openOfflineDB, promisifyRequest } from "@/components/ui/ConnectionStatus";

export interface OfflineSale {
  id?: number;
  timestamp: string;
  businessId: string;
  userId: string;
  soldBy: string;
  saleType: "cash" | "invoice";
  invoiceNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  totalAmount: number;
  amountPaid: number;
  status: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

// Save a sale to the offline queue
export async function queueOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction("pending_sales", "readwrite");
  const store = tx.objectStore("pending_sales");
  await promisifyRequest(store.add(sale));
}

// Get all pending offline sales
export async function getPendingSales(): Promise<OfflineSale[]> {
  const db = await openOfflineDB();
  const tx = db.transaction("pending_sales", "readonly");
  const store = tx.objectStore("pending_sales");
  return promisifyRequest(store.getAll());
}

// Remove a synced sale from the queue
export async function removePendingSale(id: number): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction("pending_sales", "readwrite");
  const store = tx.objectStore("pending_sales");
  await promisifyRequest(store.delete(id));
}

// Get pending sales count
export async function getPendingCount(): Promise<number> {
  const db = await openOfflineDB();
  const tx = db.transaction("pending_sales", "readonly");
  const store = tx.objectStore("pending_sales");
  return promisifyRequest(store.count());
}

// Cache data for offline use
export async function cacheProducts(products: Record<string, unknown>[]): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction("cached_products", "readwrite");
  const store = tx.objectStore("cached_products");
  await promisifyRequest(store.clear());
  for (const product of products) {
    await promisifyRequest(store.put(product));
  }
}

export async function getCachedProducts(): Promise<Record<string, unknown>[]> {
  const db = await openOfflineDB();
  const tx = db.transaction("cached_products", "readonly");
  const store = tx.objectStore("cached_products");
  return promisifyRequest(store.getAll());
}

export async function cacheCustomers(customers: Record<string, unknown>[]): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction("cached_customers", "readwrite");
  const store = tx.objectStore("cached_customers");
  await promisifyRequest(store.clear());
  for (const customer of customers) {
    await promisifyRequest(store.put(customer));
  }
}

export async function getCachedCustomers(): Promise<Record<string, unknown>[]> {
  const db = await openOfflineDB();
  const tx = db.transaction("cached_customers", "readonly");
  const store = tx.objectStore("cached_customers");
  return promisifyRequest(store.getAll());
}

export async function cacheStaff(staff: Record<string, unknown>[]): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction("cached_staff", "readwrite");
  const store = tx.objectStore("cached_staff");
  await promisifyRequest(store.clear());
  for (const member of staff) {
    await promisifyRequest(store.put(member));
  }
}

export async function getCachedStaff(): Promise<Record<string, unknown>[]> {
  const db = await openOfflineDB();
  const tx = db.transaction("cached_staff", "readonly");
  const store = tx.objectStore("cached_staff");
  return promisifyRequest(store.getAll());
}

// Sync all pending sales to Supabase
export async function syncPendingSales(supabase: Record<string, unknown>): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSales();
  let synced = 0;
  let failed = 0;

  if (pending.length === 0) return { synced, failed };

  const sb = supabase as any;
  const { data: { user } } = await sb.auth.getUser();
  let businessId = "";
  if (user) {
    const { data: profile } = await sb.from("users").select("business_id").eq("id", user.id).single();
    businessId = profile?.business_id || "";
  }

  for (const sale of pending) {
    try {
      const saleBusinessId = sale.businessId || businessId;
      const saleUserId = sale.userId || user?.id || "";

      // 1. Create the sale
      const { data: createdSale, error: saleError } = await sb
        .from("sales")
        .insert({
          business_id: saleBusinessId,
          customer_id: sale.customerId,
          created_by: saleUserId,
          sold_by: sale.soldBy,
          total_amount: sale.totalAmount,
          amount_paid: sale.amountPaid,
          payment_type: sale.saleType === "cash" ? "cash" : "credit",
          status: sale.status,
          invoice_number: sale.invoiceNumber,
          sale_date: sale.timestamp,
        })
        .select()
        .single();

      if (saleError || !createdSale) {
        failed++;
        continue;
      }

      // 2. Create sale items
      const saleItems = sale.items.map((item) => ({
        sale_id: createdSale.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }));

      await sb.from("sale_items").insert(saleItems);

      // 3. Update stock for each item
      for (const item of sale.items) {
        const { data: product } = await sb
          .from("products")
          .select("quantity_in_stock")
          .eq("id", item.productId)
          .single();

        if (product) {
          const newStock = product.quantity_in_stock - item.quantity;
          await sb.from("products").update({ quantity_in_stock: newStock }).eq("id", item.productId);

          await sb.from("inventory_log").insert({
            business_id: saleBusinessId,
            product_id: item.productId,
            created_by: saleUserId,
            logged_by: sale.soldBy,
            type: "sale",
            quantity_change: -item.quantity,
            stock_after: newStock,
            reason: sale.invoiceNumber
              ? `Invoice ${sale.invoiceNumber} — sold ${item.quantity} units (synced from offline)`
              : `Cash sale — sold ${item.quantity} units (synced from offline)`,
          });
        }
      }

      // 4. Update customer debt if needed
      if (sale.customerId && sale.totalAmount > sale.amountPaid) {
        const balance = sale.totalAmount - sale.amountPaid;
        const { data: customer } = await sb
          .from("customers")
          .select("total_debt")
          .eq("id", sale.customerId)
          .single();

        if (customer) {
          await sb.from("customers").update({ total_debt: customer.total_debt + balance }).eq("id", sale.customerId);
        }
      }

      // 5. Remove from offline queue
      if (sale.id) await removePendingSale(sale.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}