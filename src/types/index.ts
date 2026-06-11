// ============================================
// Registrar — Core Types
// ============================================

export type UserRole = "admin" | "staff";

export type PaymentType = "cash" | "credit";

export type SaleStatus = "paid" | "partial" | "unpaid";

export type InventoryLogType = "restock" | "sale" | "adjustment" | "damaged" | "returned";

export type PaymentMethod = "cash" | "transfer" | "pos";

// ---- Database Row Types ----

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  quantity_in_stock: number;
  low_stock_threshold: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  total_debt: number;
  created_at: string;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  created_by: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  payment_type: PaymentType;
  status: SaleStatus;
  // Joined fields
  customer?: Customer;
  created_by_user?: User;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  // Joined
  product?: Product;
}

export interface Payment {
  id: string;
  customer_id: string;
  sale_id: string | null;
  created_by: string;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  notes: string;
  // Joined
  customer?: Customer;
  sale?: Sale;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  created_by: string;
  type: InventoryLogType;
  quantity_change: number;
  stock_after: number;
  reason: string;
  created_at: string;
  // Joined
  product?: Product;
  created_by_user?: User;
}

// ---- Form/Input Types ----

export interface ProductFormData {
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  quantity_in_stock: number;
  low_stock_threshold: number;
}

export interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
}

export interface SaleFormData {
  customer_id: string | null;
  payment_type: PaymentType;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  amount_paid: number;
}

export interface PaymentFormData {
  customer_id: string;
  sale_id: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string;
}

// ---- Warehouses ----

export type MovementType = "in" | "out" | "transfer" | "adjustment";

export interface Warehouse {
  id: string;
  business_id: string | null;
  name: string;
  location: string;
  created_at: string;
}

export interface WarehouseStock {
  id: string;
  business_id: string | null;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
  // Joined
  product?: Product;
  warehouse?: Warehouse;
}

export interface StockMovement {
  id: string;
  business_id: string | null;
  product_id: string;
  type: MovementType;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  quantity: number;
  moved_by: string;
  notes: string;
  created_at: string;
  // Joined
  product?: Product;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
}

export interface WarehouseFormData {
  name: string;
  location: string;
}